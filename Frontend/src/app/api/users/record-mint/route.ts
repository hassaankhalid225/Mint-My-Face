import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordUserMint } from "@/lib/user-stats";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await recordUserMint(session.user.email);
  return NextResponse.json({ ok: true });
}
