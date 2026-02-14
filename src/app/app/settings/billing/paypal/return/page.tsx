import Link from "next/link";
import { redirect } from "next/navigation";

import {
  mapPaypalStatusToSubscriptionStatus,
  updateWorkspaceSubscriptionFromPaypal
} from "@/lib/billing/subscriptionsAdminRepo";
import type { PlanTier } from "@/lib/billing/subscriptionsRepo";
import { getSessionContext } from "@/lib/auth/session";
import { getTierForPaypalPlanId } from "@/lib/paypal/paypalPlans";
import { getPaypalSubscription } from "@/lib/paypal/paypalSubscriptions";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

type PaypalReturnPageProps = {
  searchParams?: {
    subscription_id?: string;
    ba_token?: string;
  };
};

function parseNextBillingTime(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export default async function PaypalReturnPage({ searchParams }: PaypalReturnPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  if (session.workspaceRole === "member") {
    redirect(`${ROUTES.appBilling}?error=forbidden`);
  }

  const subscriptionId = searchParams?.subscription_id ?? "";
  if (!subscriptionId) {
    return (
      <section>
        <h1 className="sectionTitle">Billing</h1>
        <div className="card cardPad" style={{ marginTop: 16 }}>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Missing PayPal subscription id.
          </p>
          <div className="heroCtas">
            <Link className="btn btnSecondary" href={ROUTES.appBilling}>
              Back
            </Link>
          </div>
        </div>
      </section>
    );
  }

  try {
    const paypalSub = await getPaypalSubscription(subscriptionId);
    const tier = (getTierForPaypalPlanId(paypalSub.plan_id) ?? "starter") as PlanTier;
    const status = mapPaypalStatusToSubscriptionStatus(paypalSub.status);
    const currentPeriodEnd = parseNextBillingTime(paypalSub.billing_info?.next_billing_time);

    await updateWorkspaceSubscriptionFromPaypal({
      workspaceId: session.workspaceId,
      providerSubscriptionId: paypalSub.id,
      planTier: tier,
      status,
      currentPeriodEnd
    });

    redirect(`${ROUTES.appBilling}?success=paypal_linked`);
  } catch {
    redirect(`${ROUTES.appBilling}?error=paypal_failed`);
  }
}
