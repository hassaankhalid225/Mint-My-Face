"use client";

/**
 * Paddle.js (Billing v2) loader + overlay checkout helper.
 *
 * Paddle is a Merchant of Record: it sells on our behalf, accepts global +
 * Pakistani cards, handles tax, and pays out to Pakistan via Payoneer. The
 * actual plan activation happens server-side in the signed webhook
 * (POST /api/billing/paddle/webhook) — the overlay below only collects payment.
 */

import type { PlanId } from "@/lib/plans";

type PaddleEnv = "sandbox" | "production";

interface PaddleCheckoutItem {
  priceId: string;
  quantity: number;
}

interface PaddleGlobal {
  Environment: { set: (env: PaddleEnv) => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: {
    open: (opts: {
      items: PaddleCheckoutItem[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: { successUrl?: string; displayMode?: string };
    }) => void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
const PADDLE_ENV = (process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox") as PaddleEnv;

const PRICE_IDS: Partial<Record<PlanId, string>> = {
  starter: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER ?? "",
  pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? "",
};

/** True when Paddle keys are configured — used to pick checkout path. */
export function isPaddleEnabled(): boolean {
  return Boolean(CLIENT_TOKEN);
}

export function paddlePriceId(plan: PlanId): string | undefined {
  const id = PRICE_IDS[plan];
  return id && id.startsWith("pri_") ? id : undefined;
}

let loadPromise: Promise<PaddleGlobal> | null = null;

function loadPaddleScript(): Promise<PaddleGlobal> {
  if (window.Paddle) return Promise.resolve(window.Paddle);

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]',
      );
      const onReady = () => {
        if (window.Paddle) resolve(window.Paddle);
        else reject(new Error("Paddle.js loaded but window.Paddle is missing"));
      };

      if (existing) {
        existing.addEventListener("load", onReady, { once: true });
        existing.addEventListener("error", () => reject(new Error("Paddle.js failed to load")), {
          once: true,
        });
        if (window.Paddle) onReady();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.onload = onReady;
      script.onerror = () => reject(new Error("Paddle.js failed to load"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

let initialized = false;

async function getPaddle(): Promise<PaddleGlobal> {
  const paddle = await loadPaddleScript();
  if (!initialized) {
    if (PADDLE_ENV === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({ token: CLIENT_TOKEN });
    initialized = true;
  }
  return paddle;
}

/**
 * Open the Paddle overlay for a plan. On success Paddle redirects to
 * successUrl; the webhook is what actually activates the plan.
 */
export async function openPaddleCheckout(opts: {
  plan: PlanId;
  email: string;
  successUrl: string;
}): Promise<void> {
  const priceId = paddlePriceId(opts.plan);
  if (!priceId) {
    throw new Error(`Missing Paddle price ID for plan "${opts.plan}"`);
  }
  const paddle = await getPaddle();
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: opts.email },
    customData: { plan: opts.plan, email: opts.email },
    settings: { successUrl: opts.successUrl, displayMode: "overlay" },
  });
}
