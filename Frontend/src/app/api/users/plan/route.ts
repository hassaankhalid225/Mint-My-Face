import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const plan = (body.plan as string)?.toLowerCase().trim();
  if (plan !== "starter" && plan !== "pro" && plan !== "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { plan },
  });

  return NextResponse.json({ ok: true, plan });
}
