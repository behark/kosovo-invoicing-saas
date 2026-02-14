import Link from "next/link";
import { redirect } from "next/navigation";

import { APP_NAME } from "@/lib/brand";
import { getSessionContext } from "@/lib/auth/session";
import { API_ROUTES } from "@/lib/apiRoutes";
import { ROUTES } from "@/lib/routes";

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionContext();
  if (!session) {
    redirect(ROUTES.login);
  }

  const safeSession = session!;

  return (
    <div className="appShell">
      <aside className="sidebar">
        <Link className="brand" href={ROUTES.appDashboard}>
          {APP_NAME}
        </Link>

        <nav className="sidebarNav">
          <Link className="sidebarLink" href={ROUTES.appDashboard}>
            Dashboard
          </Link>
          <Link className="sidebarLink" href={ROUTES.appCustomers}>
            Customers
          </Link>
          <Link className="sidebarLink" href={ROUTES.appInvoices}>
            Invoices
          </Link>
          <Link className="sidebarLink" href={ROUTES.appSettings}>
            Settings
          </Link>
        </nav>
      </aside>

      <div className="appMain">
        <header className="appTopbar">
          <span className="muted" style={{ fontWeight: 700 }}>
            {safeSession.workspaceName}
          </span>
          <span className="muted">{safeSession.userName}</span>
          <Link className="btn btnSecondary btnSmall" href={ROUTES.appBilling}>
            Billing
          </Link>
          <form method="post" action={API_ROUTES.authLogout}>
            <button className="btn btnSecondary btnSmall" type="submit">
              Log out
            </button>
          </form>
        </header>

        <div className="appContent">{children}</div>
      </div>
    </div>
  );
}
