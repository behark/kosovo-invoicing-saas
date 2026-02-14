import Link from "next/link";

import { APP_NAME } from "@/lib/brand";
import { ROUTES } from "@/lib/routes";

export default function MarketingLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="marketingHeader">
        <div className="container marketingHeaderInner">
          <Link className="brand" href={ROUTES.home}>
            {APP_NAME}
          </Link>

          <nav className="navLinks">
            <Link className="navLink" href={ROUTES.pricing}>
              Pricing
            </Link>
            <Link className="navLink" href={ROUTES.login}>
              Log in
            </Link>
            <Link className="btn btnPrimary" href={ROUTES.signup}>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="container marketingMain">{children}</main>

      <footer className="container marketingFooter">
        <div className="footerRow">
          <span className="muted">© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="footerLinks">
            <Link className="navLink" href={ROUTES.terms}>
              Terms
            </Link>
            <Link className="navLink" href={ROUTES.privacy}>
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
