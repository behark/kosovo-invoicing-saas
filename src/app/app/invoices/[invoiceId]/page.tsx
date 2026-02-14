import Link from "next/link";

import { API_ROUTES } from "@/lib/apiRoutes";
import { getSessionContext } from "@/lib/auth/session";
import { getInvoiceDetail } from "@/lib/invoices/invoicesRepo";
import { formatCents } from "@/lib/money";
import { buildInvoicePrintRoute, ROUTES } from "@/lib/routes";

type InvoicePageProps = {
  params: {
    invoiceId: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
  };
};

function getInvoicePageErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "forbidden") return "You do not have permission to do that.";
  if (errorCode === "not_found") return "Invoice not found.";

  return "Something went wrong. Please try again.";
}

function getInvoicePageSuccessMessage(successCode: string | undefined): string | null {
  if (!successCode) return null;

  if (successCode === "status_updated") {
    return "Invoice updated.";
  }

  return null;
}

export default async function InvoicePage({ params, searchParams }: InvoicePageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const canManageInvoice = session.workspaceRole !== "member";

  const invoice = await getInvoiceDetail(session.workspaceId, params.invoiceId);
  const errorMessage = getInvoicePageErrorMessage(searchParams?.error);
  const successMessage = getInvoicePageSuccessMessage(searchParams?.success);

  if (!invoice) {
    return (
      <section>
        <h1 className="sectionTitle">Invoice</h1>
        <div className="card cardPad" style={{ marginTop: 16 }}>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Invoice not found.
          </p>
          <div className="heroCtas">
            <Link className="btn btnSecondary" href={ROUTES.appInvoices}>
              Back to invoices
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const itemRows = invoice.items.map((item) => (
    <tr key={item.id}>
      <td className="td" style={{ fontWeight: 700 }}>
        {item.description}
      </td>
      <td className="td">{item.quantity}</td>
      <td className="td">{formatCents(item.unitPriceCents, invoice.currency)}</td>
      <td className="td">{formatCents(item.lineTotalCents, invoice.currency)}</td>
    </tr>
  ));

  const statusActions = [
    { label: "Draft", status: "draft" },
    { label: "Sent", status: "sent" },
    { label: "Paid", status: "paid" },
    { label: "Overdue", status: "overdue" }
  ] as const;

  const statusButtons = statusActions.map((action) => {
    const disabled = invoice.status === action.status;
    return (
      <form key={action.status} method="post" action={API_ROUTES.invoicesUpdate}>
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <input type="hidden" name="status" value={action.status} />
        <button className="btn btnSecondary btnSmall" type="submit" disabled={disabled}>
          Mark {action.label}
        </button>
      </form>
    );
  });

  const actionButtons = canManageInvoice ? statusButtons : null;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
        <div>
          <h1 className="sectionTitle">{invoice.number}</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Status: <span style={{ fontWeight: 800 }}>{invoice.status}</span>
          </div>
        </div>

        <div className="heroCtas" style={{ marginTop: 0 }}>
          <Link className="btn btnSecondary" href={ROUTES.appInvoices}>
            Back
          </Link>
          <Link className="btn btnPrimary" href={buildInvoicePrintRoute(invoice.id)}>
            Print / PDF
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="alert alertError" style={{ marginTop: 14 }}>
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="alert alertSuccess" style={{ marginTop: 14 }}>
          {successMessage}
        </div>
      ) : null}

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Parties
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              From
            </div>
            <div style={{ marginTop: 8, fontWeight: 800 }}>{invoice.companyName}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {invoice.companyVat ? `VAT: ${invoice.companyVat}` : ""}
              {invoice.companyAddressLine1 ? `\n${invoice.companyAddressLine1}` : ""}
              {invoice.companyAddressLine2 ? `\n${invoice.companyAddressLine2}` : ""}
              {invoice.companyCity ? `\n${invoice.companyCity}` : ""}
              {invoice.companyPostalCode ? ` ${invoice.companyPostalCode}` : ""}
              {invoice.companyCountry ? `\n${invoice.companyCountry}` : ""}
            </div>
          </div>

          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              To
            </div>
            <div style={{ marginTop: 8, fontWeight: 800 }}>{invoice.clientName}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {invoice.clientEmail ?? ""}
              {invoice.clientVat ? `\nVAT: ${invoice.clientVat}` : ""}
              {invoice.clientAddressLine1 ? `\n${invoice.clientAddressLine1}` : ""}
              {invoice.clientAddressLine2 ? `\n${invoice.clientAddressLine2}` : ""}
              {invoice.clientCity ? `\n${invoice.clientCity}` : ""}
              {invoice.clientPostalCode ? ` ${invoice.clientPostalCode}` : ""}
              {invoice.clientCountry ? `\n${invoice.clientCountry}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 }}>
          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              Issue date
            </div>
            <div style={{ marginTop: 6, fontWeight: 800 }}>{invoice.issueDate}</div>
          </div>
          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              Due date
            </div>
            <div style={{ marginTop: 6, fontWeight: 800 }}>{invoice.dueDate ?? "-"}</div>
          </div>
          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              VAT
            </div>
            <div style={{ marginTop: 6, fontWeight: 800 }}>{invoice.vatPercent}%</div>
          </div>
          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              Total
            </div>
            <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
              {formatCents(invoice.totalCents, invoice.currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Items
        </h2>

        <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th className="th">Description</th>
                <th className="th">Qty</th>
                <th className="th">Unit price</th>
                <th className="th">Line total</th>
              </tr>
            </thead>
            <tbody>{itemRows}</tbody>
          </table>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, marginTop: 14 }}>
          <div>
            <div className="muted" style={{ fontWeight: 800 }}>
              Notes
            </div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {invoice.notes ?? ""}
            </div>
          </div>

          <div className="card cardPad" style={{ boxShadow: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span className="muted">Subtotal</span>
              <span style={{ fontWeight: 800 }}>{formatCents(invoice.subtotalCents, invoice.currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
              <span className="muted">VAT</span>
              <span style={{ fontWeight: 800 }}>{formatCents(invoice.vatCents, invoice.currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
              <span className="muted" style={{ fontWeight: 800 }}>
                Total
              </span>
              <span style={{ fontWeight: 900 }}>{formatCents(invoice.totalCents, invoice.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Actions
        </h2>

        <div className="heroCtas" style={{ marginTop: 12 }}>
          {actionButtons}
          {canManageInvoice ? (
            <form method="post" action={API_ROUTES.invoicesDelete}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button className="btn btnSecondary btnSmall" type="submit">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
