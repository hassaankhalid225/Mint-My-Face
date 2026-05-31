import { prisma } from "@/lib/prisma";
import { getPlan, type PlanId } from "@/lib/plans";
import { computePlanExpiresAt, isPlanExpired, resolveEffectivePlan } from "@/lib/plan-utils";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type UserProfileStats = {
  email: string;
  name: string | null;
  plan: PlanId;
  planName: string;
  billedPlan: PlanId;
  planExpiresAt: string | null;
  planActive: boolean;
  imageCountToday: number;
  dailyLimit: number | null;
  totalImages: number;
  hdAccess: boolean;
};

export async function getUserProfileStats(email: string): Promise<UserProfileStats | null> {
  const key = email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email: key } });
  if (!user) return null;

  const today = todayKey();
  if (user.mintDay !== today) {
    user = await prisma.user.update({
      where: { email: key },
      data: { mintDay: today, mintCount: 0 },
    });
  }

  const billedPlan = (user.plan as PlanId) || "free";
  let planExpiresAt = user.planExpiresAt;

  if (
    (billedPlan === "starter" || billedPlan === "pro") &&
    isPlanExpired(billedPlan, planExpiresAt)
  ) {
    user = await prisma.user.update({
      where: { email: key },
      data: { plan: "free", planExpiresAt: null },
    });
    planExpiresAt = null;
  }

  const effectivePlan = resolveEffectivePlan(user.plan, planExpiresAt);
  const plan = getPlan(effectivePlan);
  const planActive = effectivePlan !== "free" && billedPlan === effectivePlan;

  return {
    email: user.email,
    name: user.name,
    plan: effectivePlan,
    planName: plan.name,
    billedPlan,
    planExpiresAt: planExpiresAt?.toISOString() ?? null,
    planActive,
    imageCountToday: user.mintCount,
    dailyLimit: plan.dailyImageLimit,
    totalImages: user.totalMints,
    hdAccess: plan.hdDownload && planActive,
  };
}

export async function recordUserMint(email: string): Promise<void> {
  const key = email.toLowerCase().trim();
  const today = todayKey();
  const user = await prisma.user.findUnique({ where: { email: key } });
  if (!user) return;

  const isNewDay = user.mintDay !== today;
  await prisma.user.update({
    where: { email: key },
    data: {
      mintDay: today,
      mintCount: isNewDay ? 1 : { increment: 1 },
      totalMints: { increment: 1 },
    },
  });
}

export async function activateUserPlan(email: string, planId: PlanId): Promise<void> {
  const key = email.toLowerCase().trim();
  const expiresAt = computePlanExpiresAt(planId);
  await prisma.user.update({
    where: { email: key },
    data: {
      plan: planId,
      planExpiresAt: expiresAt,
    },
  });
}
