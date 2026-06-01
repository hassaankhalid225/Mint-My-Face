import Link from "next/link";
import {
  Upload,
  Move,
  Download,
  Banknote,
  ImageIcon,
  Type,
  Lock,
  Zap,
  ArrowRight,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteLogo from "@/components/SiteLogo";
import HomeSplashBackground from "@/components/HomeSplashBackground";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `${SITE_NAME} — Put Your Face on a Dollar Bill`,
  description:
    "Create a viral custom dollar bill with your face on it. Free watermarked preview, Pro full HD download. Upload, customize, and mint in minutes.",
  path: "/",
  keywords: ["viral dollar bill", "custom money gift", "face on dollar"],
});

const steps = [
  {
    pill: "pill-thinking" as const,
    label: "Upload",
    title: "Upload Your Photo",
    desc: "Select any portrait photo from your device. Our editor accepts JPG, PNG, and WebP formats.",
    icon: Upload,
  },
  {
    pill: "pill-edit" as const,
    label: "Editing",
    title: "Position & Customize",
    desc: "Drag, resize, and rotate your photo on the bill. Add custom text like your name or a fun message.",
    icon: Move,
  },
  {
    pill: "pill-done" as const,
    label: "Done",
    title: "Download & Share",
    desc: "Get a free watermarked preview instantly, or unlock full HD (no watermark) for print and social.",
    icon: Download,
  },
];

const features = [
  {
    icon: Banknote,
    title: "Real Dollar Bill Template",
    desc: "An authentic-looking one dollar note template used as the base for your creation.",
  },
  {
    icon: ImageIcon,
    title: "Drag & Drop Editor",
    desc: "Intuitive canvas editor with full move, resize, rotate, and layer controls.",
  },
  {
    icon: Type,
    title: "Custom Text",
    desc: "Add your name, a quote, or any text with money-themed typography.",
  },
  {
    icon: Download,
    title: "Free Preview + HD Unlock",
    desc: "Watermarked preview is free. Unlock 2× HD without watermark when you are ready to print.",
  },
  {
    icon: Lock,
    title: "Secure Checkout",
    desc: "Designs are stored securely on our server only after you mint. HD unlock uses mock checkout in dev.",
  },
  {
    icon: Zap,
    title: "Instant Editor",
    desc: "No sign-up needed. Upload, customize, and mint your note in under a minute.",
  },
];

const testimonials = [
  {
    quote:
      "This is the most fun I've had making a gift in years. My friend absolutely lost it when he saw his face on a dollar bill!",
    name: "Sarah K.",
    role: "Happy Customer",
  },
  {
    quote:
      "Used it for a birthday party table decoration. Printed 50 bills with the birthday boy's face. Everyone was dying laughing.",
    name: "Marcus T.",
    role: "Party Planner",
  },
  {
    quote:
      "Super easy to use and the quality is amazing. I sent the digital version to my whole family as a Christmas prank.",
    name: "Priya M.",
    role: "Content Creator",
  },
];

export default function Home() {
  return (
    <div className="home-page flex flex-col min-h-screen">
      <HomeSplashBackground />
      <div className="home-page__content flex flex-col min-h-screen">
      <SiteNav priorityLogo />

      <section className="hero-band" aria-labelledby="hero-heading">
        <div className="container-main hero-band__grid">
          <div className="hero-band__copy">
            <p className="hero-eyebrow">
              <span className="hero-eyebrow__dot" aria-hidden />
              Mint My Face Studio
            </p>

            <h1 id="hero-heading" className="hero-band__title">
              Put your face on a{" "}
              <span className="hero-band__title-accent">dollar bill</span>
            </h1>

            <p className="hero-band__sub">
              Upload any portrait and mint it onto an authentic one-dollar note template.
              Free watermarked preview — unlock print-ready HD when you are ready.
            </p>

            <div className="hero-band__ctas">
              <Link href="/editor" className="btn btn-primary hero-cta-primary">
                Start minting — free
                <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="btn btn-secondary">
                See how it works
              </a>
            </div>

            <ul className="hero-band__stats" aria-label="Product highlights">
              <li>
                <strong>10,000+</strong>
                <span>Faces minted</span>
              </li>
              <li>
                <strong>60 sec</strong>
                <span>Average setup</span>
              </li>
              <li>
                <strong>Free</strong>
                <span>Preview download</span>
              </li>
            </ul>
          </div>

          <figure className="hero-demo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home-hero-demo.png"
              alt="Upload your photo and mint your face onto a dollar bill"
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
              className="hero-demo-image"
            />
          </figure>
        </div>
      </section>

      <section id="how-it-works" className="section-padding">
        <div className="container-main">
          <div className="section-head">
            <p className="type-caption-uppercase section-head__label">Simple 3-step process</p>
            <h2 className="type-display-lg">How it works</h2>
          </div>

          <div className="grid-steps">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <article key={i} className="step-card">
                  <span className={step.pill}>{step.label}</span>
                  <p className="step-card__num">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <div className="feature-card__icon" style={{ marginBottom: 16 }}>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="type-title-md" style={{ marginBottom: 8 }}>
                    {step.title}
                  </h3>
                  <p className="type-body-sm">{step.desc}</p>
                </article>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/editor" className="btn btn-primary">
              Try it now — free
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="section-padding">
        <div className="container-main">
          <div className="section-head">
            <p className="type-caption-uppercase section-head__label">Everything you need</p>
            <h2 className="type-display-lg">Packed with features</h2>
          </div>

          <div className="grid-features">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={i} className="feature-card">
                  <div className="feature-card__icon">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="type-title-md" style={{ marginBottom: 6 }}>
                      {f.title}
                    </h3>
                    <p className="type-body-sm">{f.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="section-head">
            <p className="type-caption-uppercase section-head__label">People love it</p>
            <h2 className="type-display-lg">What they&apos;re saying</h2>
          </div>

          <div className="grid-testimonials">
            {testimonials.map((t, i) => (
              <article key={i} className="testimonial-card">
                <p className="testimonial-card__quote">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="testimonial-card__name">{t.name}</div>
                  <div className="testimonial-card__role">{t.role}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-band__inner">
          <h2 className="type-display-lg cta-band__title">Ready to mint your face?</h2>
          <p className="cta-band__sub">
            Join thousands of people who have already created their custom dollar bills.
            It takes less than 60 seconds.
          </p>
          <Link href="/editor" className="btn btn-primary">
            Create my dollar bill — free
            <ArrowRight size={16} />
          </Link>
          <p className="cta-band__note">
            Free preview · HD from $4.99 · No sign-up required
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <SiteLogo size="sm" />
          <p className="type-body-sm">
            © {new Date().getFullYear()} Mint My Face. For entertainment purposes only.
          </p>
          <div className="site-footer__links">
            <a href="#" className="site-footer__link">
              Privacy
            </a>
            <a href="#" className="site-footer__link">
              Terms
            </a>
            <Link href="/editor" className="site-footer__link site-footer__link--accent">
              Editor
            </Link>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
