import Link from "next/link";

import { ROUTES } from "@/lib/routes";

type PlanCardProps = {
  title: string;
  price: string;
  subtitle: string;
  items: string[];
};

function PlanCard({ title, price, subtitle, items }: PlanCardProps) {
  const listItems = items.map((item) => <li key={item}>{item}</li>);

  return (
    <div className="card pricingCard">
      <h2 className="sectionTitle">{title}</h2>
      <div className="muted">{subtitle}</div>
      <div className="price">{price}</div>
      <hr className="hr" />
      <ul className="list">{listItems}</ul>
      <div className="heroCtas" style={{ marginTop: 18 }}>
        <Link className="btn btnPrimary" href={ROUTES.signup}>
          Choose {title}
        </Link>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <section>
      <h1 className="title" style={{ fontSize: 38 }}>
        Pricing
      </h1>
      <p className="subtitle">
        Start small, then upgrade when your team grows. Monthly and yearly billing will
        be supported.
      </p>

      <div className="pricingGrid">
        <PlanCard
          title="Starter"
          subtitle="For freelancers and small teams"
          price="€9 / mo"
          items={["1 workspace", "Up to 50 invoices / month", "Email support"]}
        />

        <PlanCard
          title="Pro"
          subtitle="For growing companies"
          price="€29 / mo"
          items={["Unlimited invoices", "Team members", "Customer management"]}
        />

        <PlanCard
          title="Business"
          subtitle="For larger operations"
          price="€79 / mo"
          items={["Multiple workspaces", "Advanced reporting", "Priority support"]}
        />
      </div>
    </section>
  );
}
