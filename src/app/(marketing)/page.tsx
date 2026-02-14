import Link from "next/link";

import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { ROUTES } from "@/lib/routes";

export default function HomePage() {
  return (
    <div className="hero">
      <section>
        <h1 className="title">{APP_NAME}</h1>
        <p className="subtitle">{APP_TAGLINE}</p>

        <div className="heroCtas">
          <Link className="btn btnPrimary" href={ROUTES.signup}>
            Start now
          </Link>
          <Link className="btn btnSecondary" href={ROUTES.pricing}>
            See pricing
          </Link>
        </div>
      </section>

      <aside className="card cardPad">
        <h2 className="sectionTitle">Designed for SMEs</h2>
        <ul className="list">
          <li>Create invoices with VAT and addresses</li>
          <li>Track draft / sent / paid / overdue</li>
          <li>Multi-workspace support for teams</li>
        </ul>
      </aside>
    </div>
  );
}
