export function getLoginErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "invalid") {
    return "Invalid email or password.";
  }

  return "Something went wrong. Please try again.";
}

export function getSignupErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "invalid_name") {
    return "Please enter your full name.";
  }

  if (errorCode === "invalid_email") {
    return "Please enter a valid email address.";
  }

  if (errorCode === "invalid_password") {
    return "Password must be at least 8 characters.";
  }

  if (errorCode === "email_taken") {
    return "An account with this email already exists.";
  }

  if (errorCode === "invite_invalid") {
    return "This invite link is invalid.";
  }

  if (errorCode === "invite_used") {
    return "This invite link was already used.";
  }

  if (errorCode === "invite_expired") {
    return "This invite link has expired.";
  }

  if (errorCode === "invite_email_mismatch") {
    return "This invite was issued for a different email address.";
  }

  return "Something went wrong. Please try again.";
}
