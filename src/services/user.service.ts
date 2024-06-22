import prisma from "@/utils/db";
import { Prisma } from "@prisma/client";

const userSelect: Prisma.UserSelect = {
  id: true,
  email: true,
  emailVerified: true,
  role: true,
  isActive: true,
  username: true,
  isBlocked: true,
  phone: true,
  picture: true,
  address: true,
  createdAt: true,
  updatedAt: true,
};

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: userSelect,
  });
  return user;
}

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: userSelect,
  });
  return user;
}

export async function getAllUser() {
  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
    },
    select: userSelect,
  });
  return users;
}

export async function getUserByToken(
  tokenType: "reactivate" | "change-email" | "recover-password",
  token: string
) {
  let where: Prisma.UserFindFirstArgs["where"];

  if (tokenType == "change-email") {
    where = {
      emailVerificationToken: token,
      emailVerificationExpires: { gte: new Date() },
    };
  } else if (tokenType == "recover-password") {
    where = {
      passwordResetToken: token,
      passwordResetExpires: { gte: new Date() },
    };
  } else {
    where = {
      activeToken: token,
      activeExpires: { gte: new Date() },
    };
  }
  const user = await prisma.user.findFirst({
    where,
    select: userSelect,
  });
  return user;
}

export async function generateReactiveToken(
  id: string,
  data: { activeExpires: Date; activeToken: string }
) {
  const user = await prisma.user.update({
    where: {
      id,
    },
    data,
  });
}
