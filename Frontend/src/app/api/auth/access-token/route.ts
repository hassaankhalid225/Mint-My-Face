import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAccessToken } from "@/lib/jwt";
import { findUserByEmail } from "@/lib/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await findUserByEmail(session.user.email);
  const plan = dbUser?.plan ?? session.user.plan ?? "free";

  const token = await createAccessToken({
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    plan,
  });

  return NextResponse.json({ accessToken: token, plan });
}
