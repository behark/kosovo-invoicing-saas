import "server-only";

import { dbQuery, withTransaction } from "@/lib/db";

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  createdAt: Date;
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
  created_at: Date;
};

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    vatNumber: row.vat_number,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    createdAt: row.created_at
  };
}

export async function listCustomers(workspaceId: string): Promise<Customer[]> {
  const rows = await dbQuery<CustomerRow>(
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
      country,
      created_at
    FROM customers
    WHERE workspace_id = $1
    ORDER BY created_at DESC
    `,
    [workspaceId]
  );

  return rows.map(mapCustomer);
}

export async function getCustomerById(
  workspaceId: string,
  customerId: string
): Promise<Customer | null> {
  const rows = await dbQuery<CustomerRow>(
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
      country,
      created_at
    FROM customers
    WHERE workspace_id = $1
      AND id = $2
    LIMIT 1
    `,
    [workspaceId, customerId]
  );

  const row = rows[0];
  if (!row) return null;
  return mapCustomer(row);
}

export type CreateCustomerInput = {
  name: string;
  email?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export async function createCustomer(
  workspaceId: string,
  input: CreateCustomerInput
): Promise<{ id: string }> {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO customers (
        workspace_id,
        name,
        email,
        vat_number,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
      `,
      [
        workspaceId,
        input.name,
        input.email ?? null,
        input.vatNumber ?? null,
        input.addressLine1 ?? null,
        input.addressLine2 ?? null,
        input.city ?? null,
        input.state ?? null,
        input.postalCode ?? null,
        input.country ?? null
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create customer");
    }

    return { id: row.id };
  });
}

export type UpdateCustomerInput = {
  name: string;
  email: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  input: UpdateCustomerInput
): Promise<{ updated: boolean }> {
  const rows = await dbQuery<{ id: string }>(
    `
    UPDATE customers
    SET
      name = $1,
      email = $2,
      vat_number = $3,
      address_line1 = $4,
      address_line2 = $5,
      city = $6,
      state = $7,
      postal_code = $8,
      country = $9
    WHERE workspace_id = $10
      AND id = $11
    RETURNING id
    `,
    [
      input.name,
      input.email,
      input.vatNumber,
      input.addressLine1,
      input.addressLine2,
      input.city,
      input.state,
      input.postalCode,
      input.country,
      workspaceId,
      customerId
    ]
  );

  return { updated: rows.length > 0 };
}

export async function deleteCustomer(
  workspaceId: string,
  customerId: string
): Promise<{ deleted: boolean }> {
  const rows = await dbQuery<{ id: string }>(
    `
    DELETE FROM customers
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [customerId, workspaceId]
  );

  return { deleted: rows.length > 0 };
}
