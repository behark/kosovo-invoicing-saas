import Link from "next/link";

import { getLoginErrorMessage } from "@/lib/auth/errorMessages";
import { API_ROUTES } from "@/lib/apiRoutes";
import { ROUTES } from "@/lib/routes";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = getLoginErrorMessage(searchParams?.error);

  return (
    <section>
      <h1 className="sectionTitle">Log in</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Welcome back.
      </p>

      {errorMessage ? (
        <div className="alert alertError" style={{ marginTop: 14 }}>
          {errorMessage}
        </div>
      ) : null}

      <form method="post" action={API_ROUTES.authLogin} style={{ marginTop: 16 }}>
        <div className="formRow">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" required />
        </div>

        <div className="formRow">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
          />
        </div>

        <div className="formActions">
          <button className="btn btnPrimary" type="submit">
            Log in
          </button>
          <Link className="navLink" href={ROUTES.signup}>
            Create an account
          </Link>
        </div>
      </form>
    </section>
  );
}
