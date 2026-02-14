import "server-only";

import { dbQuery } from "@/lib/db";
import type { PlanTier, SubscriptionStatus } from "@/lib/billing/subscriptionsRepo";

export function mapPaypalStatusToSubscriptionStatus(
  paypalStatus: string
): SubscriptionStatus {
  const normalized = paypalStatus.toUpperCase();

  if (normalized === "ACTIVE") return "active";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "canceled";
  if (normalized === "EXPIRED") return "canceled";
  if (normalized === "SUSPENDED") return "past_due";
  if (normalized === "APPROVAL_PENDING") return "trialing";

  return "trialing";
}

export async function setWorkspacePaypalSubscriptionId(
  workspaceId: string,
  subscriptionId: string
): Promise<void> {
  await dbQuery(
    `
    UPDATE subscriptions
    SET
      provider = 'paypal',
      provider_subscription_id = $1,
      updated_at = now()
    WHERE workspace_id = $2
    `,
    [subscriptionId, workspaceId]
  );
}

export async function updateWorkspaceSubscriptionFromPaypal(params: {
  workspaceId: string;
  providerSubscriptionId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  await dbQuery(
    `
    UPDATE subscriptions
    SET
      provider = 'paypal',
      provider_subscription_id = $1,
      plan_tier = $2,
      status = $3,
      current_period_end = $4,
      updated_at = now()
    WHERE workspace_id = $5
    `,
    [
      params.providerSubscriptionId,
      params.planTier,
      params.status,
      params.currentPeriodEnd,
      params.workspaceId
    ]
  );
}

export async function updateSubscriptionByProviderId(params: {
  providerSubscriptionId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  await dbQuery(
    `
    UPDATE subscriptions
    SET
      plan_tier = $1,
      status = $2,
      current_period_end = $3,
      updated_at = now()
    WHERE provider_subscription_id = $4
    `,
    [
      params.planTier,
      params.status,
      params.currentPeriodEnd,
      params.providerSubscriptionId
    ]
  );
}
