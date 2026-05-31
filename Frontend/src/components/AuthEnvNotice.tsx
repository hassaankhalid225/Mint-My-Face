import { isGoogleAuthConfigured } from "@/auth";

export default function AuthEnvNotice() {
  if (isGoogleAuthConfigured()) return null;

  return (
    <div className="auth-env-notice" role="alert">
      <strong>Google login not ready yet.</strong> Add your keys to{" "}
      <code>Frontend/.env</code> (same values as in <code>Backend/.env</code>):{" "}
      <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>.{" "}
      <code>AUTH_SECRET</code> is already set. See <code>SETUP.md</code>.
    </div>
  );
}
