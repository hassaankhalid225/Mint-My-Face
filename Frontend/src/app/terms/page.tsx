import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service for Mint My Face — digital novelty artwork created and downloaded online.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        Welcome to {COMPANY_NAME}. By accessing or using our website and editor (the
        “Service”), you agree to these Terms of Service. If you do not agree, please do
        not use the Service.
      </p>

      <h2>1. What we provide</h2>
      <p>
        {COMPANY_NAME} is an online design tool that lets you create personalized,
        novelty digital artwork. You upload a photo and our editor styles it into a fun,
        banknote-themed image that is delivered to you as a downloadable digital file
        (PNG). These images are decorative novelty items only. They are{" "}
        <strong>
          not legal tender, not spendable, and are not intended to resemble, replicate,
          or be used as genuine currency
        </strong>
        . Any resemblance to real currency is purely stylistic and for entertainment.
      </p>

      <h2>2. Accounts</h2>
      <p>
        Some features require an account, which you may create by signing in with Google.
        You are responsible for activity under your account and for keeping your login
        secure. You must provide accurate information and be at least 13 years old (or the
        minimum age of digital consent in your country).
      </p>

      <h2>3. Plans, billing, and payments</h2>
      <p>
        We offer a free tier and paid plans (Starter and Pro) that unlock higher daily
        image limits and watermark-free HD downloads. Payments are processed by our
        authorized reseller and Merchant of Record, <strong>Paddle</strong>
        (Paddle.com Market Limited). Paddle handles the transaction, billing, and any
        applicable taxes, and your purchase is also subject to Paddle’s buyer terms. Plan
        durations and prices are shown on our{" "}
        <Link href="/pricing">Pricing page</Link> at the time of purchase.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree that you will not:</p>
      <ul>
        <li>Use the Service to create, print, or pass off anything as real currency;</li>
        <li>
          Upload photos of other people without their permission, or content you do not
          have the right to use;
        </li>
        <li>
          Upload unlawful, hateful, defamatory, or sexually explicit content involving
          minors;
        </li>
        <li>Infringe anyone’s intellectual property, privacy, or publicity rights;</li>
        <li>Attempt to disrupt, reverse-engineer, or abuse the Service.</li>
      </ul>

      <h2>5. Your content and rights</h2>
      <p>
        You keep ownership of the photos you upload and the artwork you create. You grant
        us a limited license to process and store your uploads only as needed to provide
        the Service (for example, generating your preview and HD download). You are solely
        responsible for ensuring you have the rights to any image you upload.
      </p>

      <h2>6. Disclaimer</h2>
      <p>
        The Service and all artwork are provided “as is,” for entertainment and novelty
        purposes only, without warranties of any kind. We do not guarantee the Service
        will be uninterrupted or error-free.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {COMPANY_NAME} will not be liable for any
        indirect, incidental, or consequential damages arising from your use of the
        Service. Our total liability for any claim is limited to the amount you paid us in
        the 3 months before the claim.
      </p>

      <h2>8. Changes and termination</h2>
      <p>
        We may update these Terms or the Service from time to time. Continued use after
        changes means you accept the updated Terms. We may suspend or terminate accounts
        that violate these Terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
