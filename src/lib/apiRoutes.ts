export const API_ROUTES = {
  authSignup: "/api/auth/signup",
  authLogin: "/api/auth/login",
  authLogout: "/api/auth/logout",
  workspacesUpdate: "/api/workspaces/update",
  invitesCreate: "/api/invites/create",
  invitesRevoke: "/api/invites/revoke",
  customersCreate: "/api/customers/create",
  customersDelete: "/api/customers/delete",
  customersUpdate: "/api/customers/update",
  invoicesCreate: "/api/invoices/create",
  invoicesUpdate: "/api/invoices/update",
  invoicesDelete: "/api/invoices/delete",
  billingPaypalCheckout: "/api/billing/paypal/checkout",
  billingPaypalWebhook: "/api/billing/paypal/webhook"
} as const;
