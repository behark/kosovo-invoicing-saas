import Link from "next/link";

import { API_ROUTES } from "@/lib/apiRoutes";
import { getSessionContext } from "@/lib/auth/session";
import { listCustomers } from "@/lib/customers/customersRepo";
import { listInvoices } from "@/lib/invoices/invoicesRepo";
import { formatCents } from "@/lib/money";
import { buildInvoiceDetailRoute, ROUTES } from "@/lib/routes";

type InvoicesPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

function getInvoicesPageErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "limit_reached") {
    return "Starter plan invoice limit reached for this month. Upgrade to create more invoices.";
  }

  if (errorCode === "no_customer") return "Please select a customer.";
  if (errorCode === "invalid_issue_date") return "Issue date is required.";
  if (errorCode === "no_items") return "Add at least one invoice item.";
  if (errorCode === "forbidden") return "You do not have permission to do that.";

  return "Something went wrong. Please try again.";
}

function getInvoicesPageSuccessMessage(successCode: string | undefined): string | null {
  if (!successCode) return null;
  if (successCode === "deleted") return "Invoice deleted.";
  return null;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const errorMessage = getInvoicesPageErrorMessage(searchParams?.error);
  const successMessage = getInvoicesPageSuccessMessage(searchParams?.success);
  const customers = await listCustomers(session.workspaceId);
  const invoices = await listInvoices(session.workspaceId);

  const customerOptions = customers.map((customer) => (
    <option key={customer.id} value={customer.id}>
      {customer.name}
    </option>
  ));

  const defaultIssueDate = new Date().toISOString().slice(0, 10);

  const itemRows = Array.from({ length: 3 }).map((_, idx) => {
    const isFirst = idx === 0;
    return (
      <tr key={idx}>
        <td className="td">
          <input
            className="input"
            name="itemDescription"
            type="text"
            placeholder="Service / Product"
            required={isFirst}
          />
        </td>
        <td className="td">
          <input
            className="input"
            name="itemQuantity"
            type="number"
            min={1}
            defaultValue={1}
            required={isFirst}
          />
        </td>
        <td className="td">
          <input
            className="input"
            name="itemUnitPrice"
            type="text"
            placeholder="0.00"
            required={isFirst}
          />
        </td>
      </tr>
    );
  });

  const invoiceRows = invoices.map((invoice) => (
    <tr key={invoice.id}>
      <td className="td" style={{ fontWeight: 800 }}>
        <Link href={buildInvoiceDetailRoute(invoice.id)}>{invoice.number}</Link>
      </td>
      <td className="td">{invoice.customerName}</td>
      <td className="td">{invoice.issueDate}</td>
      <td className="td">{invoice.status}</td>
      <td className="td">{formatCents(invoice.totalCents, invoice.currency)}</td>
      <td className="td">
        <Link className="btn btnSecondary btnSmall" href={buildInvoiceDetailRoute(invoice.id)}>
          View
        </Link>
      </td>
    </tr>
  ));

  const hasCustomers = customers.length > 0;

  return (
    <section>
      <h1 className="sectionTitle">Invoices</h1>

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
          Create invoice
        </h2>

        {!hasCustomers ? (
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
            Create at least one customer first.
            {" "}
            <Link href={ROUTES.appCustomers} style={{ fontWeight: 800 }}>
              Go to customers
            </Link>
            .
          </p>
        ) : (
          <form method="post" action={API_ROUTES.invoicesCreate} style={{ marginTop: 14 }}>
            <div className="formRow">
              <label className="label" htmlFor="customerId">
                Customer
              </label>
              <select className="input" id="customerId" name="customerId" required>
                <option value="">Select customer...</option>
                {customerOptions}
              </select>
            </div>

            <div className="formRow">
              <label className="label" htmlFor="issueDate">
                Issue date
              </label>
              <input
                className="input"
                id="issueDate"
                name="issueDate"
                type="date"
                defaultValue={defaultIssueDate}
                required
              />
            </div>

            <div className="formRow">
              <label className="label" htmlFor="dueDate">
                Due date (optional)
              </label>
              <input className="input" id="dueDate" name="dueDate" type="date" />
            </div>

            <div className="formRow">
              <label className="label" htmlFor="vatPercent">
                VAT %
              </label>
              <input
                className="input"
                id="vatPercent"
                name="vatPercent"
                type="number"
                min={0}
                max={100}
                defaultValue={0}
                required
              />
            </div>

            <div className="formRow">
              <label className="label" htmlFor="notes">
                Notes (optional)
              </label>
              <textarea
                className="input"
                id="notes"
                name="notes"
                rows={3}
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="formRow">
              <label className="label">Items</label>
              <div className="card" style={{ overflow: "hidden" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Description</th>
                      <th className="th">Qty</th>
                      <th className="th">Unit price</th>
                    </tr>
                  </thead>
                  <tbody>{itemRows}</tbody>
                </table>
              </div>
            </div>

            <div className="formActions" style={{ justifyContent: "flex-start" }}>
              <button className="btn btnPrimary" type="submit">
                Create invoice
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Invoice list
        </h2>

        {invoices.length === 0 ? (
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
            No invoices yet.
          </p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th className="th">Number</th>
                <th className="th">Customer</th>
                <th className="th">Issue date</th>
                <th className="th">Status</th>
                <th className="th">Total</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>{invoiceRows}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
