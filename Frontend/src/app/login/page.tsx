import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import EmailLoginForm from "@/components/EmailLoginForm";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import JsonLd from "@/components/JsonLd";
import SiteNav from "@/components/SiteNav";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

const LOGIN_DESCRIPTION =
  "Log in with email or Google to access your designs, plans, and HD downloads on Mint My Face.";

export const metadata = pageMetadata({
  title: "Log in",
  description: LOGIN_DESCRIPTION,
  path: "/login",
  keywords: ["login", "sign in", "google auth", "email login"],
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(params.callbackUrl ?? "/editor");
  }

  const callbackUrl = params.callbackUrl ?? "/editor";

  if (params.error) {
    const q =
      callbackUrl !== "/editor"
        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "";
    redirect(`/login${q}`);
  }

  const signupHref = `/signup${callbackUrl !== "/editor" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <div className="page-shell page-shell--auth">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Log in — ${SITE_NAME}`,
          description: LOGIN_DESCRIPTION,
          url: `${SITE_URL}/login`,
        }}
      />
      <SiteNav />
      <main className="auth-layout" id="main-content">
        <div className="container-main auth-layout__container">
          <article className="auth-card auth-card--minimal" aria-labelledby="login-heading">
            <Link href="/" className="auth-card__back">
              ← Back to home
            </Link>

            <header className="auth-card__header">
              <h1 id="login-heading" className="auth-card__title">
                Welcome back
              </h1>
              <p className="auth-card__sub">Log in to continue.</p>
            </header>

            <EmailLoginForm callbackUrl={callbackUrl} />

            <div className="auth-card__divider" role="separator">
              <span>or</span>
            </div>

            <GoogleAuthButton mode="login" callbackUrl={callbackUrl} variant="secondary" />

            <footer className="auth-card__footer auth-card__footer--switch">
              <p className="auth-card__switch">
                New here? <Link href={signupHref}>Sign up</Link>
              </p>
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
}
