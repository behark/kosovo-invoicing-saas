import "server-only";

import { dbQuery } from "@/lib/db";

export type PlanTier = "starter" | "pro" | "business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type WorkspaceSubscription = {
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
};

export type WorkspaceSubscriptionDetails = WorkspaceSubscription & {
  provider: string;
  providerSubscriptionId: string | null;
};

type SubscriptionRow = {
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  current_period_end: Date | null;
};

export async function getWorkspaceSubscription(
  workspaceId: string
): Promise<WorkspaceSubscription | null> {
  const rows = await dbQuery<SubscriptionRow>(
    `
    SELECT plan_tier, status, current_period_end
    FROM subscriptions
    WHERE workspace_id = $1
    LIMIT 1
    `,
    [workspaceId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    planTier: row.plan_tier,
    status: row.status,
    currentPeriodEnd: row.current_period_end
  };
}

export async function countInvoicesThisMonth(workspaceId: string): Promise<number> {
  const rows = await dbQuery<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM invoices
    WHERE workspace_id = $1
      AND created_at >= date_trunc('month', now())
    `,
    [workspaceId]
  );

  const raw = rows[0]?.count ?? "0";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

type SubscriptionDetailsRow = {
  provider: string;
  provider_subscription_id: string | null;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  current_period_end: Date | null;
};

export async function getWorkspaceSubscriptionDetails(
  workspaceId: string
): Promise<WorkspaceSubscriptionDetails | null> {
  const rows = await dbQuery<SubscriptionDetailsRow>(
    `
    SELECT provider, provider_subscription_id, plan_tier, status, current_period_end
    FROM subscriptions
    WHERE workspace_id = $1
    LIMIT 1
    `,
    [workspaceId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    provider: row.provider,
    providerSubscriptionId: row.provider_subscription_id,
    planTier: row.plan_tier,
    status: row.status,
    currentPeriodEnd: row.current_period_end
  };
}
