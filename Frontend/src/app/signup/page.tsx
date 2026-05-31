import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuthEnvNotice from "@/components/AuthEnvNotice";
import EmailSignupForm from "@/components/EmailSignupForm";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import JsonLd from "@/components/JsonLd";
import SiteNav from "@/components/SiteNav";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

const SIGNUP_DESCRIPTION =
  "Create a free account with email or Google — custom dollar bills, plans, and HD downloads.";

export const metadata = pageMetadata({
  title: "Sign up",
  description: SIGNUP_DESCRIPTION,
  path: "/signup",
  keywords: ["sign up", "register", "create account", "google sign up"],
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(params.callbackUrl ?? "/editor?welcome=1");
  }

  const callbackUrl = params.callbackUrl ?? "/editor";
  const loginHref = `/login${callbackUrl !== "/editor" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <div className="page-shell page-shell--auth">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Sign up — ${SITE_NAME}`,
          description: SIGNUP_DESCRIPTION,
          url: `${SITE_URL}/signup`,
        }}
      />
      <SiteNav variant="auth" />
      <main className="auth-layout" id="main-content">
        <div className="container-main auth-layout__container">
          <article className="auth-card auth-card--minimal" aria-labelledby="signup-heading">
            <Link href="/" className="auth-card__back">
              ← Back to home
            </Link>

            <AuthEnvNotice />

            <header className="auth-card__header">
              <h1 id="signup-heading" className="auth-card__title">
                Create your account
              </h1>
              <p className="auth-card__sub">Name, email, and password — or use Google.</p>
            </header>

            <EmailSignupForm callbackUrl={callbackUrl} />

            <div className="auth-card__divider" role="separator">
              <span>or</span>
            </div>

            <GoogleAuthButton mode="signup" callbackUrl={callbackUrl} variant="secondary" />

            <footer className="auth-card__footer auth-card__footer--switch">
              <p className="auth-card__switch">
                Already have an account? <Link href={loginHref}>Log in</Link>
              </p>
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
}
