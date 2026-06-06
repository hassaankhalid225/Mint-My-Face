"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanId } from "@/lib/plans";
import { startPlanCheckout } from "@/lib/api";
import { isPaddleEnabled, openPaddleCheckout } from "@/lib/paddle";

export default function PricingCheckoutButton({
  planId,
  label,
  featured,
}: {
  planId: PlanId;
  label: string;
  featured?: boolean;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (planId === "free") {
    return (
      <a href="/editor" className="btn btn-secondary pricing-card__cta">
        {label}
      </a>
    );
  }

  const handleClick = async () => {
    if (status !== "authenticated" || !session?.user?.email) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }

    setLoading(true);
    try {
      // Preferred path: Paddle (Merchant of Record) overlay. The signed
      // webhook activates the plan; successUrl reuses the existing handler.
      if (isPaddleEnabled()) {
        const successUrl = `${window.location.origin}/pricing?success=${planId}`;
        await openPaddleCheckout({
          plan: planId,
          email: session.user.email!,
          successUrl,
        });
        return;
      }

      const { checkout_url } = await startPlanCheckout(
        planId,
        session.user.email!,
      );
      if (checkout_url.includes("checkout=error")) {
        alert("Stripe checkout failed. Check backend logs and your Stripe keys.");
        return;
      }
      if (checkout_url.startsWith("http://") || checkout_url.startsWith("https://")) {
        window.location.href = checkout_url;
      } else {
        const path = checkout_url.startsWith("/")
          ? checkout_url
          : `/${checkout_url}`;
        router.push(path);
      }
    } catch {
      alert("Checkout unavailable. Add Stripe keys or use mock mode in backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={featured ? "btn btn-primary pricing-card__cta" : "btn btn-secondary pricing-card__cta"}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Loading…" : label}
    </button>
  );
}
