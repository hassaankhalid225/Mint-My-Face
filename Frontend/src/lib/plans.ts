export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  period: string;
  description: string;
  features: string[];
  dailyMintLimit: number | null;
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
    description: "Try Mint My Face with watermarked previews.",
    features: [
      "Watermarked preview download",
      "Standard quality PNG (~480p)",
      "Full editor access",
      "3 mints per day",
    ],
    dailyMintLimit: 3,
    hdDownload: false,
    printQuality: false,
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$2",
    priceCents: 200,
    period: "per day",
    description: "Create more notes every day.",
    features: [
      "5 image mints per day",
      "Watermarked downloads",
      "Standard quality PNG",
      "Email support",
    ],
    dailyMintLimit: 5,
    hdDownload: false,
    printQuality: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$5",
    priceCents: 500,
    period: "per month",
    description: "Unlimited mints and print-ready HD.",
    features: [
      "Unlimited image mints",
      "Unlock full HD — no watermark",
      "Print-quality PNG export",
      "Priority processing",
      "Purchase tracking in your account",
    ],
    dailyMintLimit: null,
    hdDownload: true,
    printQuality: true,
    featured: true,
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
