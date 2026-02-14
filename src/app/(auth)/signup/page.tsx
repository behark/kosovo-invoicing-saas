import Link from "next/link";

import { getSignupErrorMessage } from "@/lib/auth/errorMessages";
import { API_ROUTES } from "@/lib/apiRoutes";
import { ROUTES } from "@/lib/routes";

type SignupPageProps = {
  searchParams?: {
    error?: string;
    invite?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const errorMessage = getSignupErrorMessage(searchParams?.error);
  const inviteToken = String(searchParams?.invite ?? "").trim();
  const isInvited = Boolean(inviteToken);

  return (
    <section>
      <h1 className="sectionTitle">Create account</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        {isInvited ? "You have been invited to join a workspace." : "Start with a workspace and invite your team later."}
      </p>

      {errorMessage ? (
        <div className="alert alertError" style={{ marginTop: 14 }}>
          {errorMessage}
        </div>
      ) : null}

      {isInvited ? (
        <div className="alert" style={{ marginTop: 14 }}>
          Use the same email address the invite was sent to.
        </div>
      ) : null}

      <form method="post" action={API_ROUTES.authSignup} style={{ marginTop: 16 }}>
        {isInvited ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}
        <div className="formRow">
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input className="input" id="name" name="name" type="text" required />
        </div>

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
            minLength={8}
            required
          />
        </div>

        <div className="formActions">
          <button className="btn btnPrimary" type="submit">
            Create account
          </button>
          <Link className="navLink" href={ROUTES.login}>
            Already have an account?
          </Link>
        </div>
      </form>
    </section>
  );
}
