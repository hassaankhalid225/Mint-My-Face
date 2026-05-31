import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SiteNav from "@/components/SiteNav";
import JsonLd from "@/components/JsonLd";
import { getUserProfileStats } from "@/lib/user-stats";
import { getPlan } from "@/lib/plans";
import { formatPlanExpiry } from "@/lib/plan-utils";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Profile",
  description: "Your Mint My Face plan, daily image usage, and total images created.",
  path: "/profile",
});

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/profile");
  }

  const stats = await getUserProfileStats(session.user.email);
  if (!stats) {
    redirect("/login?callbackUrl=/profile");
  }

  const plan = getPlan(stats.plan);
  const expiryLabel = stats.planExpiresAt
    ? formatPlanExpiry(new Date(stats.planExpiresAt))
    : null;

  const usageLabel =
    stats.dailyLimit === null
      ? `${stats.imageCountToday} images today (unlimited)`
      : `${stats.imageCountToday} / ${stats.dailyLimit} images used today`;

  const usagePct =
    stats.dailyLimit && stats.dailyLimit > 0
      ? Math.min(100, Math.round((stats.imageCountToday / stats.dailyLimit) * 100))
      : stats.dailyLimit === null
        ? 100
        : 0;

  return (
    <div className="page-shell">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: `Profile — ${SITE_NAME}`,
          url: `${SITE_URL}/profile`,
        }}
      />
      <SiteNav />
      <main className="profile-page" id="main-content">
        <div className="container-main profile-page__container">
          <header className="profile-page__header">
            <h1 className="profile-page__title">Your profile</h1>
            <p className="profile-page__sub">
              {stats.name || session.user.name || "Creator"} · {stats.email}
            </p>
          </header>

          <div className="profile-grid">
            <section className="profile-card">
              <h2 className="profile-card__label">Current plan</h2>
              <p className="profile-card__value profile-card__value--plan">{stats.planName}</p>
              <p className="profile-card__hint">
                {plan.priceLabel}
                {plan.priceCents > 0 ? ` · ${plan.period}` : ""}
              </p>
              {stats.planActive && expiryLabel && (
                <p className="profile-card__hint profile-card__hint--accent">
                  Active until {expiryLabel}
                </p>
              )}
              {!stats.planActive && stats.billedPlan !== "free" && (
                <p className="profile-card__hint profile-card__hint--warn">
                  Your {stats.billedPlan} plan has expired — you&apos;re on Free (1 image/day).
                </p>
              )}
              <Link href="/pricing" className="btn btn-secondary profile-card__cta">
                {stats.plan === "pro" && stats.planActive ? "View plans" : "Upgrade plan"}
              </Link>
            </section>

            <section className="profile-card">
              <h2 className="profile-card__label">Today&apos;s usage</h2>
              <p className="profile-card__value">{usageLabel}</p>
              {stats.dailyLimit !== null && (
                <div className="profile-usage-bar" aria-hidden>
                  <span
                    className="profile-usage-bar__fill"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              )}
              <p className="profile-card__hint">
                {stats.hdAccess
                  ? "HD downloads unlocked on Pro."
                  : stats.dailyLimit === 1
                    ? "Free plan: one image per day."
                    : stats.dailyLimit === 5
                      ? "Starter plan: up to 5 images per day while active."
                      : stats.dailyLimit === null
                        ? "Pro plan: unlimited images while active."
                        : "Upgrade for more daily images or unlimited Pro."}
              </p>
            </section>

            <section className="profile-card profile-card--wide">
              <h2 className="profile-card__label">Total images created</h2>
              <p className="profile-card__value profile-card__value--stat">{stats.totalImages}</p>
              <p className="profile-card__hint">All images saved on Mint My Face.</p>
              <Link href="/editor" className="btn btn-primary profile-card__cta">
                Create another image
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
