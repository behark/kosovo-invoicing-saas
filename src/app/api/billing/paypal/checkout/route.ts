import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import { setWorkspacePaypalSubscriptionId } from "@/lib/billing/subscriptionsAdminRepo";
import type { PlanTier } from "@/lib/billing/subscriptionsRepo";
import { getPaypalPlanIdForTier } from "@/lib/paypal/paypalPlans";
import { createPaypalSubscription } from "@/lib/paypal/paypalSubscriptions";
import { ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeRequiredString(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function isPlanTier(value: string): value is PlanTier {
  return value === "starter" || value === "pro" || value === "business";
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  if (session.workspaceRole === "member") {
    return buildRedirect(request, `${ROUTES.appBilling}?error=forbidden`);
  }

  const formData = await request.formData();
  const tier = normalizeRequiredString(formData.get("planTier"));

  if (!isPlanTier(tier)) {
    return buildRedirect(request, `${ROUTES.appBilling}?error=invalid_plan`);
  }

  let planId: string;
  try {
    planId = getPaypalPlanIdForTier(tier);
  } catch {
    return buildRedirect(request, `${ROUTES.appBilling}?error=paypal_config_missing`);
  }

  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  const returnUrl = `${origin}${ROUTES.appBillingPaypalReturn}`;
  const cancelUrl = `${origin}${ROUTES.appBilling}?canceled=1`;

  try {
    const paypalSub = await createPaypalSubscription({
      planId,
      returnUrl,
      cancelUrl,
      brandName: APP_NAME
    });

    await setWorkspacePaypalSubscriptionId(session.workspaceId, paypalSub.id);

    return NextResponse.redirect(paypalSub.approveUrl);
  } catch {
    return buildRedirect(request, `${ROUTES.appBilling}?error=paypal_unavailable`);
  }
}
