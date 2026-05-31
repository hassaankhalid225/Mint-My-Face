import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { activateUserPlan } from "@/lib/user-stats";
import type { PlanId } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const plan = (body.plan as string)?.toLowerCase().trim() as PlanId;
  if (plan !== "starter" && plan !== "pro" && plan !== "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (plan === "free") {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { plan: "free", planExpiresAt: null },
    });
  } else {
    await activateUserPlan(session.user.email, plan);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { plan: true, planExpiresAt: true },
  });

  return NextResponse.json({
    ok: true,
    plan: user?.plan,
    planExpiresAt: user?.planExpiresAt?.toISOString() ?? null,
  });
}
