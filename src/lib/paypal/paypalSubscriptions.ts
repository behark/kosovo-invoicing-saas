import "server-only";

import { paypalFetch } from "./paypalClient";

export type PaypalLink = {
  href: string;
  rel: string;
  method: string;
};

export type PaypalSubscription = {
  id: string;
  status: string;
  plan_id: string;
  links?: PaypalLink[];
  billing_info?: {
    next_billing_time?: string;
  };
};

export async function createPaypalSubscription(params: {
  planId: string;
  returnUrl: string;
  cancelUrl: string;
  brandName: string;
}): Promise<{ id: string; approveUrl: string }> {
  const { data } = await paypalFetch<PaypalSubscription>("/v1/billing/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      plan_id: params.planId,
      application_context: {
        brand_name: params.brandName,
        user_action: "SUBSCRIBE_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl
      }
    })
  });

  const approveLink = data.links?.find((link) => link.rel === "approve")?.href;
  if (!approveLink) {
    throw new Error("PayPal approve link not found");
  }

  return { id: data.id, approveUrl: approveLink };
}

export async function getPaypalSubscription(subscriptionId: string): Promise<PaypalSubscription> {
  const { data } = await paypalFetch<PaypalSubscription>(
    `/v1/billing/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return data;
}

type VerifyWebhookResponse = {
  verification_status: string;
};

export async function verifyPaypalWebhookSignature(params: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
}): Promise<boolean> {
  const { data } = await paypalFetch<VerifyWebhookResponse>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auth_algo: params.authAlgo,
        cert_url: params.certUrl,
        transmission_id: params.transmissionId,
        transmission_sig: params.transmissionSig,
        transmission_time: params.transmissionTime,
        webhook_id: params.webhookId,
        webhook_event: params.webhookEvent
      })
    }
  );

  return data.verification_status === "SUCCESS";
}
