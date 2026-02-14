import "server-only";

import { dbQuery, withTransaction } from "@/lib/db";
import { getWorkspaceInvoiceProfile } from "@/lib/workspaces/workspacesRepo";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type InvoiceListItem = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  customerName: string;
  currency: string;
  totalCents: number;
  createdAt: Date;
};

type InvoiceListRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issue_date: string | Date;
  due_date: string | Date | null;
  currency: string;
  total_cents: number;
  created_at: Date;
  customer_name: string;
};

function toDateOnlyString(value: string | Date | null): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

export async function listInvoices(workspaceId: string): Promise<InvoiceListItem[]> {
  const rows = await dbQuery<InvoiceListRow>(
    `
    SELECT
      i.id,
      i.number,
      i.status,
      i.issue_date,
      i.due_date,
      i.currency,
      i.total_cents,
      i.created_at,
      c.name AS customer_name
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.workspace_id = $1
    ORDER BY i.created_at DESC
    `,
    [workspaceId]
  );

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    issueDate: toDateOnlyString(row.issue_date) ?? "",
    dueDate: toDateOnlyString(row.due_date),
    customerName: row.customer_name,
    currency: row.currency,
    totalCents: row.total_cents,
    createdAt: row.created_at
  }));
}

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreateInvoiceInput = {
  customerId: string;
  issueDate: string;
  dueDate?: string;
  vatPercent: number;
  notes?: string;
  items: InvoiceItemInput[];
};

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

type SequenceRow = {
  next_number: number;
};

function padNumber(value: number): string {
  return String(value).padStart(4, "0");
}

function buildInvoiceNumber(issueDate: string, sequence: number): string {
  const year = issueDate.slice(0, 4);
  return `INV-${year}-${padNumber(sequence)}`;
}

function calcTotals(items: InvoiceItemInput[], vatPercent: number): {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  items: Array<InvoiceItemInput & { lineTotalCents: number }>;
} {
  const normalizedVat = Math.max(0, Math.min(100, Math.trunc(vatPercent)));

  const computedItems = items.map((item) => {
    const qty = Math.max(1, Math.trunc(item.quantity));
    const unit = Math.max(0, Math.trunc(item.unitPriceCents));
    const lineTotalCents = qty * unit;
    return {
      description: item.description,
      quantity: qty,
      unitPriceCents: unit,
      lineTotalCents
    };
  });

  const subtotalCents = computedItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const vatCents = Math.round((subtotalCents * normalizedVat) / 100);
  const totalCents = subtotalCents + vatCents;

  return { subtotalCents, vatCents, totalCents, items: computedItems };
}

export async function createInvoice(
  workspaceId: string,
  input: CreateInvoiceInput
): Promise<{ id: string; number: string }> {
  if (input.items.length === 0) {
    throw new Error("Invoice requires at least one item");
  }

  const profile = await getWorkspaceInvoiceProfile(workspaceId);
  if (!profile) {
    throw new Error("Workspace not found");
  }

  return withTransaction(async (client) => {
    const customerResult = await client.query<CustomerRow>(
      `
      SELECT
        id,
        name,
        email,
        vat_number,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country
      FROM customers
      WHERE id = $1
        AND workspace_id = $2
      LIMIT 1
      `,
      [input.customerId, workspaceId]
    );

    const customer = customerResult.rows[0];
    if (!customer) {
      throw new Error("Customer not found");
    }

    const seqResult = await client.query<SequenceRow>(
      `
      SELECT next_number
      FROM invoice_sequences
      WHERE workspace_id = $1
      FOR UPDATE
      `,
      [workspaceId]
    );

    if (seqResult.rows.length === 0) {
      await client.query(
        `
        INSERT INTO invoice_sequences (workspace_id, next_number)
        VALUES ($1, 1)
        ON CONFLICT (workspace_id) DO NOTHING
        `,
        [workspaceId]
      );
    }

    const lockedSeqResult = await client.query<SequenceRow>(
      `
      SELECT next_number
      FROM invoice_sequences
      WHERE workspace_id = $1
      FOR UPDATE
      `,
      [workspaceId]
    );

    const nextNumber = lockedSeqResult.rows[0]?.next_number;
    if (!nextNumber) {
      throw new Error("Failed to allocate invoice number");
    }

    await client.query(
      `
      UPDATE invoice_sequences
      SET next_number = next_number + 1
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    const number = buildInvoiceNumber(input.issueDate, nextNumber);

    const totals = calcTotals(input.items, input.vatPercent);

    const invoiceResult = await client.query<{ id: string }>(
      `
      INSERT INTO invoices (
        workspace_id,
        customer_id,
        number,
        status,
        currency,
        issue_date,
        due_date,
        company_name,
        company_vat,
        company_address_line1,
        company_address_line2,
        company_city,
        company_state,
        company_postal_code,
        company_country,
        client_name,
        client_email,
        client_vat,
        client_address_line1,
        client_address_line2,
        client_city,
        client_state,
        client_postal_code,
        client_country,
        vat_percent,
        subtotal_cents,
        vat_cents,
        total_cents,
        notes
      )
      VALUES (
        $1,$2,$3,'draft','EUR',$4,$5,
        $6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,
        $23,$24,$25,$26,$27
      )
      RETURNING id
      `,
      [
        workspaceId,
        customer.id,
        number,
        input.issueDate,
        input.dueDate ?? null,
        profile.companyName ?? profile.name,
        profile.companyVat,
        profile.companyAddressLine1,
        profile.companyAddressLine2,
        profile.companyCity,
        profile.companyState,
        profile.companyPostalCode,
        profile.companyCountry,
        customer.name,
        customer.email,
        customer.vat_number,
        customer.address_line1,
        customer.address_line2,
        customer.city,
        customer.state,
        customer.postal_code,
        customer.country,
        Math.max(0, Math.min(100, Math.trunc(input.vatPercent))),
        totals.subtotalCents,
        totals.vatCents,
        totals.totalCents,
        input.notes ?? null
      ]
    );

    const invoiceId = invoiceResult.rows[0]?.id;
    if (!invoiceId) {
      throw new Error("Failed to create invoice");
    }

    for (const item of totals.items) {
      await client.query(
        `
        INSERT INTO invoice_items (
          invoice_id,
          description,
          quantity,
          unit_price_cents,
          line_total_cents
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          invoiceId,
          item.description,
          item.quantity,
          item.unitPriceCents,
          item.lineTotalCents
        ]
      );
    }

    return { id: invoiceId, number };
  });
}

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type InvoiceDetail = {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  vatPercent: number;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  companyName: string;
  companyVat: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyPostalCode: string | null;
  companyCountry: string | null;
  clientName: string;
  clientEmail: string | null;
  clientVat: string | null;
  clientAddressLine1: string | null;
  clientAddressLine2: string | null;
  clientCity: string | null;
  clientState: string | null;
  clientPostalCode: string | null;
  clientCountry: string | null;
  notes: string | null;
  createdAt: Date;
  items: InvoiceItem[];
};

type InvoiceDetailRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  issue_date: string | Date;
  due_date: string | Date | null;
  vat_percent: number;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  company_name: string;
  company_vat: string | null;
  company_address_line1: string | null;
  company_address_line2: string | null;
  company_city: string | null;
  company_state: string | null;
  company_postal_code: string | null;
  company_country: string | null;
  client_name: string;
  client_email: string | null;
  client_vat: string | null;
  client_address_line1: string | null;
  client_address_line2: string | null;
  client_city: string | null;
  client_state: string | null;
  client_postal_code: string | null;
  client_country: string | null;
  notes: string | null;
  created_at: Date;
};

type InvoiceItemRow = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export async function getInvoiceDetail(
  workspaceId: string,
  invoiceId: string
): Promise<InvoiceDetail | null> {
  const invoiceRows = await dbQuery<InvoiceDetailRow>(
    `
    SELECT
      id,
      number,
      status,
      currency,
      issue_date,
      due_date,
      vat_percent,
      subtotal_cents,
      vat_cents,
      total_cents,
      company_name,
      company_vat,
      company_address_line1,
      company_address_line2,
      company_city,
      company_state,
      company_postal_code,
      company_country,
      client_name,
      client_email,
      client_vat,
      client_address_line1,
      client_address_line2,
      client_city,
      client_state,
      client_postal_code,
      client_country,
      notes,
      created_at
    FROM invoices
    WHERE id = $1
      AND workspace_id = $2
    LIMIT 1
    `,
    [invoiceId, workspaceId]
  );

  const invoice = invoiceRows[0];
  if (!invoice) return null;

  const itemRows = await dbQuery<InvoiceItemRow>(
    `
    SELECT id, description, quantity, unit_price_cents, line_total_cents
    FROM invoice_items
    WHERE invoice_id = $1
    ORDER BY created_at ASC
    `,
    [invoiceId]
  );

  const items = itemRows.map((row) => ({
    id: row.id,
    description: row.description,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    lineTotalCents: row.line_total_cents
  }));

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    issueDate: toDateOnlyString(invoice.issue_date) ?? "",
    dueDate: toDateOnlyString(invoice.due_date),
    vatPercent: invoice.vat_percent,
    subtotalCents: invoice.subtotal_cents,
    vatCents: invoice.vat_cents,
    totalCents: invoice.total_cents,
    companyName: invoice.company_name,
    companyVat: invoice.company_vat,
    companyAddressLine1: invoice.company_address_line1,
    companyAddressLine2: invoice.company_address_line2,
    companyCity: invoice.company_city,
    companyState: invoice.company_state,
    companyPostalCode: invoice.company_postal_code,
    companyCountry: invoice.company_country,
    clientName: invoice.client_name,
    clientEmail: invoice.client_email,
    clientVat: invoice.client_vat,
    clientAddressLine1: invoice.client_address_line1,
    clientAddressLine2: invoice.client_address_line2,
    clientCity: invoice.client_city,
    clientState: invoice.client_state,
    clientPostalCode: invoice.client_postal_code,
    clientCountry: invoice.client_country,
    notes: invoice.notes,
    createdAt: invoice.created_at,
    items
  };
}

export async function updateInvoiceStatus(
  workspaceId: string,
  invoiceId: string,
  status: InvoiceStatus
): Promise<{ updated: boolean }> {
  const rows = await dbQuery<{ id: string }>(
    `
    UPDATE invoices
    SET
      status = $1,
      sent_at = CASE WHEN $1 = 'sent' THEN now() ELSE sent_at END,
      paid_at = CASE WHEN $1 = 'paid' THEN now() ELSE paid_at END,
      updated_at = now()
    WHERE id = $2
      AND workspace_id = $3
    RETURNING id
    `,
    [status, invoiceId, workspaceId]
  );

  return { updated: rows.length > 0 };
}

export async function deleteInvoice(
  workspaceId: string,
  invoiceId: string
): Promise<{ deleted: boolean }> {
  const rows = await dbQuery<{ id: string }>(
    `
    DELETE FROM invoices
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [invoiceId, workspaceId]
  );

  return { deleted: rows.length > 0 };
}
