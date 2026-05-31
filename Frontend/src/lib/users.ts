import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

export async function createEmailUser(data: {
  email: string;
  name: string;
  password: string;
}) {
  const email = data.email.toLowerCase().trim();
  const passwordHash = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      email,
      name: data.name.trim(),
      passwordHash,
      plan: "free",
      mintCount: 0,
    },
  });
}

export async function upsertGoogleUser(data: {
  email: string;
  name?: string | null;
  googleId: string;
  image?: string | null;
}): Promise<{ user: Awaited<ReturnType<typeof findUserByEmail>>; isNew: boolean }> {
  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        googleId: data.googleId,
        name: existing.name || data.name || undefined,
        image: data.image || existing.image || undefined,
      },
    });
    return { user, isNew: false };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      googleId: data.googleId,
      image: data.image,
      plan: "free",
      mintCount: 0,
    },
  });
  return { user, isNew: true };
}
