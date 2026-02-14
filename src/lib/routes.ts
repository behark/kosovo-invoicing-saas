export const ROUTES = {
  home: "/",
  pricing: "/pricing",
  terms: "/terms",
  privacy: "/privacy",
  login: "/login",
  signup: "/signup",
  app: "/app",
  appDashboard: "/app",
  appCustomers: "/app/customers",
  appInvoices: "/app/invoices",
  appSettings: "/app/settings",
  appBilling: "/app/settings/billing",
  appBillingPaypalReturn: "/app/settings/billing/paypal/return"
} as const;

export function buildInvoiceDetailRoute(invoiceId: string): string {
  return `${ROUTES.appInvoices}/${invoiceId}`;
}

export function buildCustomerDetailRoute(customerId: string): string {
  return `${ROUTES.appCustomers}/${customerId}`;
}

export function buildInvoicePrintRoute(invoiceId: string): string {
  return `${ROUTES.appInvoices}/${invoiceId}/print`;
}

export function buildInviteSignupRoute(inviteToken: string): string {
  const params = new URLSearchParams({ invite: inviteToken });
  return `${ROUTES.signup}?${params.toString()}`;
}
