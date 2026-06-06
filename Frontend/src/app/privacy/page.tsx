import LegalPage from "@/components/LegalPage";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for Mint My Face — what data we collect, how we use it, and your choices.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains what information {COMPANY_NAME} collects, how we use
        it, and the choices you have. By using our website and editor, you agree to this
        policy.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account info:</strong> when you sign in with Google, we receive your
          name and email address.
        </li>
        <li>
          <strong>Uploaded images:</strong> the photos you upload to create your artwork,
          and the generated images.
        </li>
        <li>
          <strong>Usage data:</strong> basic information such as how many images you
          create per day, needed to enforce plan limits.
        </li>
        <li>
          <strong>Payment data:</strong> handled by our payment provider, Paddle. We do
          not see or store your full card details.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To provide the editor and deliver your downloads;</li>
        <li>To manage your account, plan, and daily image limits;</li>
        <li>To process payments through Paddle;</li>
        <li>To respond to support requests and keep the Service secure.</li>
      </ul>

      <h2>3. Payments and Paddle</h2>
      <p>
        Purchases are processed by <strong>Paddle</strong> (Paddle.com Market Limited),
        our Merchant of Record. When you check out, Paddle collects and processes the
        information needed to complete your payment under its own privacy policy. We
        receive confirmation of your purchase (such as the plan and your email) so we can
        activate your account.
      </p>

      <h2>4. Sharing</h2>
      <p>
        We do not sell your personal information. We share data only with service
        providers that help us run the Service — for example, our payment processor
        (Paddle), authentication (Google sign-in), and hosting providers — and only as
        needed to operate the Service or comply with the law.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep your account information for as long as your account is active. Uploaded
        images are stored only as needed to provide your previews and downloads and may be
        removed periodically. You can request deletion of your account and associated data
        at any time.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, or delete
        your personal data, or object to certain processing. To exercise these rights,
        contact us using the email below.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and to operate the Service. Our
        payment provider may set its own cookies during checkout.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not intended for children under 13, and we do not knowingly collect
        their personal information.
      </p>

      <h2>9. Contact</h2>
      <p>
        For any privacy questions or requests, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
