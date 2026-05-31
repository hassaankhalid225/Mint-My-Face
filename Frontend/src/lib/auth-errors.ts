export function describeAuthError(code: string): string {
  switch (code) {
    case "Configuration":
      return (
        "Google sign-in could not start. Your Frontend/.env keys look set — " +
        "this usually means the dev server could not reach Google (Wi‑Fi, VPN, firewall) " +
        "or Google OAuth redirect URIs are wrong. Use redirect URI " +
        "http://localhost:3000/api/auth/callback/google, restart npm run dev, then try again."
      );
    case "OAuthCallback":
    case "OAuthSignin":
    case "OAuthCreateAccount":
      return (
        "Google returned an error during sign-in. Confirm redirect URI " +
        "http://localhost:3000/api/auth/callback/google in Google Cloud Console " +
        "and that NEXTAUTH_URL=http://localhost:3000 in Frontend/.env."
      );
    case "AccessDenied":
      return "Sign-in was cancelled or not allowed.";
    default:
      return `Sign-in failed (${code}). Check Frontend/.env and Google Cloud OAuth settings.`;
  }
}
