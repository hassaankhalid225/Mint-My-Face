import { SignJWT, jwtVerify } from "jose";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  name?: string | null;
  plan: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("JWT_SECRET or AUTH_SECRET is required");
  return new TextEncoder().encode(secret);
}

/** API access token for FastAPI (Bearer). Valid 7 days. */
export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name ?? null,
    plan: payload.plan,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const email = payload.email as string | undefined;
    const sub = payload.sub as string | undefined;
    if (!email || !sub) return null;
    return {
      sub,
      email,
      name: (payload.name as string | null) ?? null,
      plan: (payload.plan as string) || "free",
    };
  } catch {
    return null;
  }
}
