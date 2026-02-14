import "server-only";

import type { PlanTier } from "@/lib/billing/subscriptionsRepo";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getPaypalPlanIdForTier(tier: PlanTier): string {
  if (tier === "starter") return getRequiredEnv("PAYPAL_PLAN_ID_STARTER");
  if (tier === "pro") return getRequiredEnv("PAYPAL_PLAN_ID_PRO");
  return getRequiredEnv("PAYPAL_PLAN_ID_BUSINESS");
}

export function getTierForPaypalPlanId(planId: string): PlanTier | null {
  const starter = process.env.PAYPAL_PLAN_ID_STARTER;
  const pro = process.env.PAYPAL_PLAN_ID_PRO;
  const business = process.env.PAYPAL_PLAN_ID_BUSINESS;

  if (starter && planId === starter) return "starter";
  if (pro && planId === pro) return "pro";
  if (business && planId === business) return "business";

  return null;
}
