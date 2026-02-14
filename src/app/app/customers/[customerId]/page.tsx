import Link from "next/link";

import { API_ROUTES } from "@/lib/apiRoutes";
import { getSessionContext } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/customers/customersRepo";
import { ROUTES } from "@/lib/routes";

type CustomerPageProps = {
  params: {
    customerId: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
  };
};

function getCustomerPageErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "invalid_name") return "Customer name is required.";
  if (errorCode === "invalid_email") return "Please enter a valid email address.";
  if (errorCode === "forbidden") return "You do not have permission to do that.";
  if (errorCode === "not_found") return "Customer not found.";

  return "Something went wrong. Please try again.";
}

function getCustomerPageSuccessMessage(successCode: string | undefined): string | null {
  if (!successCode) return null;
  if (successCode === "updated") return "Customer updated.";
  return null;
}

export default async function CustomerPage({ params, searchParams }: CustomerPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const customer = await getCustomerById(session.workspaceId, params.customerId);
  const errorMessage = getCustomerPageErrorMessage(searchParams?.error);
  const successMessage = getCustomerPageSuccessMessage(searchParams?.success);

  if (!customer) {
    return (
      <section>
        <h1 className="sectionTitle">Customer</h1>

        {errorMessage ? (
          <div className="alert alertError" style={{ marginTop: 14 }}>
            {errorMessage}
          </div>
        ) : null}

        <div className="card cardPad" style={{ marginTop: 16 }}>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Customer not found.
          </p>
          <div className="heroCtas">
            <Link className="btn btnSecondary" href={ROUTES.appCustomers}>
              Back to customers
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
        <div>
          <h1 className="sectionTitle">{customer.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Edit customer details used on invoices.
          </p>
        </div>
        <div className="heroCtas" style={{ marginTop: 0 }}>
          <Link className="btn btnSecondary" href={ROUTES.appCustomers}>
            Back
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
          Customer details
        </h2>

        <form method="post" action={API_ROUTES.customersUpdate} style={{ marginTop: 14 }}>
          <input type="hidden" name="customerId" value={customer.id} />

          <div className="formRow">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              className="input"
              id="name"
              name="name"
              type="text"
              defaultValue={customer.name}
              required
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="email">
              Email (optional)
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="vatNumber">
              VAT number (optional)
            </label>
            <input
              className="input"
              id="vatNumber"
              name="vatNumber"
              type="text"
              defaultValue={customer.vatNumber ?? ""}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="addressLine1">
              Address line 1 (optional)
            </label>
            <input
              className="input"
              id="addressLine1"
              name="addressLine1"
              type="text"
              defaultValue={customer.addressLine1 ?? ""}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="addressLine2">
              Address line 2 (optional)
            </label>
            <input
              className="input"
              id="addressLine2"
              name="addressLine2"
              type="text"
              defaultValue={customer.addressLine2 ?? ""}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="formRow">
              <label className="label" htmlFor="city">
                City (optional)
              </label>
              <input
                className="input"
                id="city"
                name="city"
                type="text"
                defaultValue={customer.city ?? ""}
              />
            </div>
            <div className="formRow">
              <label className="label" htmlFor="state">
                State/Region (optional)
              </label>
              <input
                className="input"
                id="state"
                name="state"
                type="text"
                defaultValue={customer.state ?? ""}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="formRow">
              <label className="label" htmlFor="postalCode">
                Postal code (optional)
              </label>
              <input
                className="input"
                id="postalCode"
                name="postalCode"
                type="text"
                defaultValue={customer.postalCode ?? ""}
              />
            </div>
            <div className="formRow">
              <label className="label" htmlFor="country">
                Country (optional)
              </label>
              <input
                className="input"
                id="country"
                name="country"
                type="text"
                defaultValue={customer.country ?? ""}
              />
            </div>
          </div>

          <div className="formActions" style={{ justifyContent: "flex-start" }}>
            <button className="btn btnPrimary" type="submit">
              Save customer
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
