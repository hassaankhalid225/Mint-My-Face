export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  period: string;
  description: string;
  features: string[];
  /** Max images per calendar day; null = unlimited while plan is active */
  dailyImageLimit: number | null;
  hdDownload: boolean;
  printQuality: boolean;
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceCents: 0,
    period: "forever",
    description: "One custom dollar-bill image per day.",
    features: [
      "1 image per day",
      "Watermarked preview download",
      "Standard quality PNG (~480p)",
      "Full editor access",
    ],
    dailyImageLimit: 1,
    hdDownload: false,
    printQuality: false,
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$2",
    priceCents: 200,
    period: "per day",
    description: "Five custom dollar-bill images per day.",
    features: [
      "5 images per day",
      "Watermarked downloads",
      "Standard quality PNG (~480p)",
      "Active right after checkout",
    ],
    dailyImageLimit: 5,
    hdDownload: false,
    printQuality: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$5",
    priceCents: 500,
    period: "per month",
    description: "Unlimited images and print-ready HD every month.",
    features: [
      "Unlimited images",
      "Full HD download — no watermark",
      "Print-quality PNG export",
      "Priority processing",
    ],
    dailyImageLimit: null,
    hdDownload: true,
    printQuality: true,
    featured: true,
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
