import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserProfileStats } from "@/lib/user-stats";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getUserProfileStats(session.user.email);
  if (!stats) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(stats);
}
