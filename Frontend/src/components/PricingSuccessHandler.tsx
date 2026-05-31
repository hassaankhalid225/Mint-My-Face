"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { activatePlan } from "@/lib/api";

/** Activates plan after mock checkout or Stripe success redirect. */
export default function PricingSuccessHandler() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || status !== "authenticated") return;

    const email = session?.user?.email;
    if (!email) return;

    const activated = searchParams.get("activated");
    if (activated === "1") return;

    const plan =
      searchParams.get("success") ??
      searchParams.get("plan");
    const isMock = searchParams.get("checkout") === "mock";
    const isStripeSuccess = !!searchParams.get("success");

    if (!plan || (!isMock && !isStripeSuccess)) return;
    if (plan !== "starter" && plan !== "pro") return;

    done.current = true;
    Promise.all([
      activatePlan(plan, email),
      fetch("/api/users/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      }),
    ])
      .then(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        url.searchParams.delete("token");
        url.searchParams.delete("plan");
        url.searchParams.set("activated", "1");
        window.history.replaceState({}, "", url.pathname + url.search);
      })
      .catch(() => {
        done.current = false;
      });
  }, [searchParams, session, status]);

  return null;
}
