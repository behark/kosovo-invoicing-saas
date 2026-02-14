import Link from "next/link";

import { getSessionContext } from "@/lib/auth/session";
import { countInvoicesThisMonth, getWorkspaceSubscriptionDetails } from "@/lib/billing/subscriptionsRepo";
import { listInvoices } from "@/lib/invoices/invoicesRepo";
import { formatCents } from "@/lib/money";
import { buildInvoiceDetailRoute, ROUTES } from "@/lib/routes";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
}

export default async function AppHomePage() {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const [subscription, invoicesThisMonth, invoices] = await Promise.all([
    getWorkspaceSubscriptionDetails(session.workspaceId),
    countInvoicesThisMonth(session.workspaceId),
    listInvoices(session.workspaceId)
  ]);

  const planTier = subscription?.planTier ?? "starter";
  const planLimit = planTier === "starter" ? 50 : null;
  const usageLabel = planLimit ? `${invoicesThisMonth} / ${planLimit}` : String(invoicesThisMonth);

  const recentInvoices = invoices.slice(0, 5);
  const recentInvoiceRows = recentInvoices.map((invoice) => (
    <tr key={invoice.id}>
      <td className="td" style={{ fontWeight: 800 }}>
        <Link href={buildInvoiceDetailRoute(invoice.id)}>{invoice.number}</Link>
      </td>
      <td className="td">{invoice.customerName}</td>
      <td className="td">{invoice.issueDate}</td>
      <td className="td">{invoice.status}</td>
      <td className="td">{formatCents(invoice.totalCents, invoice.currency)}</td>
    </tr>
  ));

  return (
    <section>
      <h1 className="sectionTitle">Dashboard</h1>
      <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
        Workspace overview.
      </p>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <div className="card cardPad">
          <div className="muted" style={{ fontWeight: 800 }}>
            Subscription
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, textTransform: "capitalize" }}>{planTier}</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            Status: <span style={{ fontWeight: 800 }}>{subscription?.status ?? "-"}</span>
            {"\n"}
            Next bill: <span style={{ fontWeight: 800 }}>{formatDate(subscription?.currentPeriodEnd ?? null)}</span>
          </div>
          <div className="heroCtas" style={{ marginTop: 12 }}>
            <Link className="btn btnSecondary btnSmall" href={ROUTES.appBilling}>
              Manage billing
            </Link>
          </div>
        </div>

        <div className="card cardPad">
          <div className="muted" style={{ fontWeight: 800 }}>
            Invoices this month
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 22 }}>{usageLabel}</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            {planLimit ? "Starter plan limit applies." : "Unlimited plan."}
          </div>
          <div className="heroCtas" style={{ marginTop: 12 }}>
            <Link className="btn btnSecondary btnSmall" href={ROUTES.appInvoices}>
              Go to invoices
            </Link>
          </div>
        </div>

        <div className="card cardPad">
          <div className="muted" style={{ fontWeight: 800 }}>
            Quick actions
          </div>
          <div className="heroCtas" style={{ marginTop: 12, justifyContent: "flex-start" }}>
            <Link className="btn btnPrimary btnSmall" href={ROUTES.appInvoices}>
              Create invoice
            </Link>
            <Link className="btn btnSecondary btnSmall" href={ROUTES.appCustomers}>
              Add customer
            </Link>
            <Link className="btn btnSecondary btnSmall" href={ROUTES.appSettings}>
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
          <h2 className="sectionTitle" style={{ fontSize: 18 }}>
            Recent invoices
          </h2>
          <Link className="btn btnSecondary btnSmall" href={ROUTES.appInvoices}>
            View all
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>{recentInvoiceRows}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
