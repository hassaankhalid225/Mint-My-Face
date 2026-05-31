import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import SiteNav from "@/components/SiteNav";
import PricingCheckoutButton from "@/components/PricingCheckoutButton";
import PricingSuccessHandler from "@/components/PricingSuccessHandler";
import { PLANS } from "@/lib/plans";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

const PRICING_DESCRIPTION =
  "Choose Free, Starter ($2/day), or Pro ($5/month) for custom dollar bills — daily mint limits, watermarked previews, and full HD print downloads.";

export const metadata = pageMetadata({
  title: "Pricing & Plans",
  description: PRICING_DESCRIPTION,
  path: "/pricing",
  keywords: ["pricing", "subscription", "pro plan", "dollar bill HD download"],
});

export default function PricingPage() {
  return (
    <div className="page-shell home-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Pricing — ${SITE_NAME}`,
          description: PRICING_DESCRIPTION,
          url: `${SITE_URL}/pricing`,
        }}
      />
      <SiteNav />
      <Suspense fallback={null}>
        <PricingSuccessHandler />
      </Suspense>
      <main className="section-padding" id="main-content">
        <div className="container-main">
          <header className="section-head">
            <p className="type-caption-uppercase section-head__label">Pricing</p>
            <h1 className="type-display-lg">Choose your plan</h1>
            <p className="pricing-page__intro type-body-sm">
              Start free. Upgrade when you need more daily mints or print-ready HD without
              watermark.
            </p>
          </header>

          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`pricing-card${plan.featured ? " pricing-card--featured" : ""}`}
              >
                {plan.featured && <span className="pricing-card__badge">Most popular</span>}
                <h2 className="pricing-card__name">{plan.name}</h2>
                <p className="pricing-card__price">
                  <span>{plan.priceLabel}</span>
                  {plan.priceCents > 0 && <small> / {plan.period}</small>}
                </p>
                <p className="pricing-card__desc">{plan.description}</p>
                <ul className="pricing-card__features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={16} strokeWidth={2.5} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <PricingCheckoutButton
                  planId={plan.id}
                  label={
                    plan.id === "free"
                      ? "Start free"
                      : plan.id === "starter"
                        ? "Get Starter"
                        : "Go Pro"
                  }
                  featured={plan.featured}
                />
              </article>
            ))}
          </div>

          <section className="pricing-faq" aria-labelledby="pricing-faq-heading">
            <h2 id="pricing-faq-heading" className="type-title-md">
              Download quality
            </h2>
            <ul className="type-body-sm">
              <li>
                <strong>Free / Starter:</strong> Watermarked PNG at standard quality (~480p)
                — great for sharing online.
              </li>
              <li>
                <strong>Pro:</strong> Full HD, no watermark — best for printing.
              </li>
              <li>
                HD unlock in the editor requires login, then an active Pro plan (or
                one-time unlock per note).
              </li>
            </ul>
          </section>

          <p className="pricing-page__back">
            <Link href="/editor">Try the editor →</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
