import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createAccessToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { resolveEffectivePlan } from "@/lib/plan-utils";
import { findUserByEmail, upsertGoogleUser } from "@/lib/users";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const authSecret = process.env.AUTH_SECRET?.trim();

const googleProvider =
  googleClientId && googleClientSecret
    ? Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        // Explicit endpoints — avoids OIDC discovery fetch (often fails as "Configuration")
        authorization: {
          url: "https://accounts.google.com/o/oauth2/v2/auth",
          params: {
            prompt: "select_account",
            scope: "openid email profile",
            response_type: "code",
          },
        },
        token: "https://oauth2.googleapis.com/token",
        userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      })
    : null;

/** Stay signed in ~30 days (browser session cookie). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60 * 60 * 24,
  },
  providers: [
    ...(googleProvider ? [googleProvider] : []),
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.toLowerCase().trim();
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan ?? "free",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email || !account.providerAccountId) return false;
        const { user: dbUser, isNew } = await upsertGoogleUser({
          email: user.email,
          name: user.name,
          googleId: account.providerAccountId,
          image: user.image,
        });
        user.id = dbUser!.id;
        user.isNewUser = isNew;
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.picture = user.image ?? undefined;
        if (typeof user.isNewUser === "boolean") token.isNewUser = user.isNewUser;
        if ("plan" in user && user.plan) token.plan = user.plan as string;
      }

      if (token.email) {
        const dbUser = await findUserByEmail(token.email as string);
        if (dbUser) {
          token.sub = dbUser.id;
          token.plan = resolveEffectivePlan(dbUser.plan, dbUser.planExpiresAt);
        }
      }

      if (token.sub && token.email) {
        token.accessToken = await createAccessToken({
          sub: token.sub as string,
          email: token.email as string,
          name: (token.name as string) ?? null,
          plan: (token.plan as string) || "free",
        });
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
        session.user.plan = (token.plan as string) || "free";
        if (typeof token.isNewUser === "boolean") {
          session.user.isNewUser = token.isNewUser;
        }
      }
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/editor`;
    },
  },
  trustHost: true,
});

export function isGoogleAuthConfigured(): boolean {
  return Boolean(googleClientId && googleClientSecret && authSecret);
}
