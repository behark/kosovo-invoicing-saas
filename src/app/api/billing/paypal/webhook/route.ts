import { NextResponse } from "next/server";

import {
  mapPaypalStatusToSubscriptionStatus,
  updateSubscriptionByProviderId
} from "@/lib/billing/subscriptionsAdminRepo";
import type { PlanTier } from "@/lib/billing/subscriptionsRepo";
import { getTierForPaypalPlanId } from "@/lib/paypal/paypalPlans";
import { verifyPaypalWebhookSignature } from "@/lib/paypal/paypalSubscriptions";

type WebhookEvent = {
  event_type: string;
  resource?: {
    id?: string;
    status?: string;
    plan_id?: string;
    billing_info?: {
      next_billing_time?: string;
    };
  };
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function parseNextBillingTime(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function POST(request: Request) {
  const webhookId = getRequiredEnv("PAYPAL_WEBHOOK_ID");

  const authAlgo = request.headers.get("paypal-auth-algo") ?? "";
  const certUrl = request.headers.get("paypal-cert-url") ?? "";
  const transmissionId = request.headers.get("paypal-transmission-id") ?? "";
  const transmissionSig = request.headers.get("paypal-transmission-sig") ?? "";
  const transmissionTime = request.headers.get("paypal-transmission-time") ?? "";

  const rawBody = await request.text();
  let event: WebhookEvent;

  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const verified = await verifyPaypalWebhookSignature({
    authAlgo,
    certUrl,
    transmissionId,
    transmissionSig,
    transmissionTime,
    webhookId,
    webhookEvent: event
  });

  if (!verified) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const subscriptionId = event.resource?.id;
  const paypalStatus = event.resource?.status;
  const planId = event.resource?.plan_id;

  if (!subscriptionId || !paypalStatus || !planId) {
    return NextResponse.json({ ok: true });
  }

  const tier = getTierForPaypalPlanId(planId) ?? ("starter" as PlanTier);
  const status = mapPaypalStatusToSubscriptionStatus(paypalStatus);
  const currentPeriodEnd = parseNextBillingTime(event.resource?.billing_info?.next_billing_time);

  await updateSubscriptionByProviderId({
    providerSubscriptionId: subscriptionId,
    planTier: tier,
    status,
    currentPeriodEnd
  });

  return NextResponse.json({ ok: true });
}
