import type { PlanId } from "@/lib/plans";

/** When a paid plan ends, user falls back to free limits. */
export function computePlanExpiresAt(planId: PlanId, from = new Date()): Date | null {
  if (planId === "starter") {
    return new Date(from.getTime() + 24 * 60 * 60 * 1000);
  }
  if (planId === "pro") {
    const end = new Date(from);
    end.setMonth(end.getMonth() + 1);
    return end;
  }
  return null;
}

export function isPlanExpired(
  planId: string,
  planExpiresAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (planId === "free" || !planExpiresAt) return false;
  const end = planExpiresAt instanceof Date ? planExpiresAt : new Date(planExpiresAt);
  return now.getTime() > end.getTime();
}

export function resolveEffectivePlan(
  planId: string,
  planExpiresAt: Date | string | null | undefined,
): PlanId {
  if (planId === "starter" || planId === "pro") {
    if (!isPlanExpired(planId, planExpiresAt)) return planId;
  }
  return "free";
}

export function formatPlanExpiry(planExpiresAt: Date | null): string | null {
  if (!planExpiresAt) return null;
  return planExpiresAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
