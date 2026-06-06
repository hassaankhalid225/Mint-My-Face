import LegalPage from "@/components/LegalPage";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Refund Policy",
  description:
    "Refund Policy for Mint My Face digital plans and downloads, processed through Paddle.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        {COMPANY_NAME} sells digital products — online plans and downloadable novelty
        artwork. This policy explains when refunds are available. Payments and refunds are
        processed by our Merchant of Record, <strong>Paddle</strong>.
      </p>

      <h2>1. Digital goods</h2>
      <p>
        Because our products are digital and delivered instantly, all sales are generally
        final once a plan is activated or an HD file has been downloaded. Please use the
        free tier and watermarked preview to make sure you’re happy before purchasing.
      </p>

      <h2>2. When we offer refunds</h2>
      <p>We will provide a refund within 14 days of purchase if:</p>
      <ul>
        <li>You were charged but your plan or download was never delivered;</li>
        <li>
          A technical fault on our side prevented you from using what you paid for, and we
          were unable to resolve it;
        </li>
        <li>You were charged in error or charged more than once for the same purchase.</li>
      </ul>

      <h2>3. What is not refundable</h2>
      <ul>
        <li>
          Plans where you have already used the included images or downloaded the HD file;
        </li>
        <li>Change-of-mind requests after the product has been delivered and used;</li>
        <li>Dissatisfaction with a design you created yourself in the editor.</li>
      </ul>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the email
        address used at checkout and your Paddle order or receipt number. We aim to respond
        within 3 business days. Approved refunds are issued by Paddle to your original
        payment method.
      </p>

      <h2>5. Buyer protection</h2>
      <p>
        As our Merchant of Record, Paddle also handles billing inquiries and may offer its
        own buyer terms. You can contact Paddle directly through the receipt email you
        receive after purchase.
      </p>
    </LegalPage>
  );
}
