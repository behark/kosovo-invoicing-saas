import Link from "next/link";

import { API_ROUTES } from "@/lib/apiRoutes";
import { getSessionContext } from "@/lib/auth/session";
import { getWorkspaceSubscriptionDetails } from "@/lib/billing/subscriptionsRepo";
import { ROUTES } from "@/lib/routes";

type BillingPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
    canceled?: string;
  };
};

function getBillingPageErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "forbidden") return "You do not have permission to change billing.";
  if (errorCode === "invalid_plan") return "Please choose a valid plan.";
  if (errorCode === "paypal_unavailable") return "PayPal is currently unavailable. Please try again.";
  if (errorCode === "paypal_failed") return "PayPal subscription confirmation failed.";
  if (errorCode === "paypal_config_missing") {
    return "PayPal plan configuration is missing. Add PAYPAL_PLAN_ID_* env vars.";
  }

  return "Something went wrong. Please try again.";
}

function getBillingPageSuccessMessage(params: {
  successCode: string | undefined;
  canceled: string | undefined;
}): string | null {
  if (params.canceled) return "Checkout canceled.";
  if (params.successCode === "paypal_linked") return "Subscription updated.";
  return null;
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const canManageBilling = session.workspaceRole !== "member";
  const subscription = await getWorkspaceSubscriptionDetails(session.workspaceId);

  const errorMessage = getBillingPageErrorMessage(searchParams?.error);
  const successMessage = getBillingPageSuccessMessage({
    successCode: searchParams?.success,
    canceled: searchParams?.canceled
  });

  const planCards = [
    {
      tier: "starter",
      title: "Starter",
      subtitle: "For solo work",
      price: "€9 / month",
      items: ["Up to 50 invoices / month", "Customers", "PDF export"]
    },
    {
      tier: "pro",
      title: "Pro",
      subtitle: "For growing teams",
      price: "€19 / month",
      items: ["Unlimited invoices", "Team members", "Priority support"]
    },
    {
      tier: "business",
      title: "Business",
      subtitle: "For larger companies",
      price: "€39 / month",
      items: ["Unlimited invoices", "Advanced permissions", "Dedicated onboarding"]
    }
  ] as const;

  const planCardNodes = planCards.map((card) => {
    const isCurrent = subscription?.planTier === card.tier;
    const buttonLabel = isCurrent ? "Current plan" : `Choose ${card.title}`;
    const listItems = card.items.map((item) => <li key={item}>{item}</li>);

    return (
      <div key={card.tier} className="card pricingCard" style={{ minWidth: 0 }}>
        <h2 className="sectionTitle">{card.title}</h2>
        <div className="muted">{card.subtitle}</div>
        <div className="price">{card.price}</div>
        <hr className="hr" />
        <ul className="list">{listItems}</ul>

        <div className="heroCtas" style={{ marginTop: 18 }}>
          {canManageBilling ? (
            <form method="post" action={API_ROUTES.billingPaypalCheckout}>
              <input type="hidden" name="planTier" value={card.tier} />
              <button className="btn btnPrimary" type="submit" disabled={isCurrent}>
                {buttonLabel}
              </button>
            </form>
          ) : (
            <div className="muted" style={{ lineHeight: 1.7 }}>
              Admin access required.
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
        <div>
          <h1 className="sectionTitle">Billing</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Manage your subscription.
          </p>
        </div>
        <div className="heroCtas" style={{ marginTop: 0 }}>
          <Link className="btn btnSecondary" href={ROUTES.appSettings}>
            Settings
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
          Current subscription
        </h2>

        {subscription ? (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div className="card cardPad" style={{ boxShadow: "none" }}>
              <div className="muted" style={{ fontWeight: 800 }}>
                Plan
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{subscription.planTier}</div>
            </div>
            <div className="card cardPad" style={{ boxShadow: "none" }}>
              <div className="muted" style={{ fontWeight: 800 }}>
                Status
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{subscription.status}</div>
            </div>
            <div className="card cardPad" style={{ boxShadow: "none" }}>
              <div className="muted" style={{ fontWeight: 800 }}>
                Renew / next bill
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{formatDate(subscription.currentPeriodEnd)}</div>
            </div>
            <div className="card cardPad" style={{ boxShadow: "none" }}>
              <div className="muted" style={{ fontWeight: 800 }}>
                Provider
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{subscription.provider}</div>
            </div>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
            No subscription record found.
          </p>
        )}
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {planCardNodes}
      </div>
    </section>
  );
}
