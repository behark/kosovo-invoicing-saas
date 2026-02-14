import Link from "next/link";

import PrintButton from "@/components/PrintButton";
import { getSessionContext } from "@/lib/auth/session";
import { getInvoiceDetail } from "@/lib/invoices/invoicesRepo";
import { formatCents } from "@/lib/money";
import { buildInvoiceDetailRoute, ROUTES } from "@/lib/routes";

type InvoicePrintPageProps = {
  params: {
    invoiceId: string;
  };
};

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const invoice = await getInvoiceDetail(session.workspaceId, params.invoiceId);
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

  return (
    <section>
      <div className="heroCtas" style={{ justifyContent: "space-between", marginTop: 0 }}>
        <Link className="btn btnSecondary" href={buildInvoiceDetailRoute(invoice.id)}>
          Back
        </Link>
        <PrintButton className="btn btnPrimary" />
      </div>

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
          <div>
            <h1 className="sectionTitle" style={{ fontSize: 22 }}>
              {invoice.number}
            </h1>
            <div className="muted" style={{ marginTop: 6 }}>
              Issue date: <span style={{ fontWeight: 800 }}>{invoice.issueDate}</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              {formatCents(invoice.totalCents, invoice.currency)}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Status: <span style={{ fontWeight: 800 }}>{invoice.status}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <div className="muted" style={{ fontWeight: 800 }}>
              From
            </div>
            <div style={{ marginTop: 8, fontWeight: 800 }}>{invoice.companyName}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {[
                invoice.companyVat ? `VAT: ${invoice.companyVat}` : null,
                invoice.companyAddressLine1,
                invoice.companyAddressLine2,
                invoice.companyCity,
                invoice.companyPostalCode,
                invoice.companyCountry
              ]
                .filter(Boolean)
                .join("\n")}
            </div>
          </div>

          <div>
            <div className="muted" style={{ fontWeight: 800 }}>
              To
            </div>
            <div style={{ marginTop: 8, fontWeight: 800 }}>{invoice.clientName}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {[
                invoice.clientEmail,
                invoice.clientVat ? `VAT: ${invoice.clientVat}` : null,
                invoice.clientAddressLine1,
                invoice.clientAddressLine2,
                invoice.clientCity,
                invoice.clientPostalCode,
                invoice.clientCountry
              ]
                .filter(Boolean)
                .join("\n")}
            </div>
          </div>
        </div>

        <div className="card" style={{ overflow: "hidden", marginTop: 18 }}>
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div className="card cardPad" style={{ width: 320, boxShadow: "none" }}>
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

        {invoice.notes ? (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              Notes
            </div>
            <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {invoice.notes}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
