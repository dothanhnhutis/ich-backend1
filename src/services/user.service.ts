import prisma from "@/utils/db";
import { isBase64Data, uploadImageCloudinary } from "@/utils/image";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const userPublicInfo: Prisma.UserSelect = {
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
    select: userPublicInfo,
  });
  return user;
}

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: userPublicInfo,
  });
  return user;
}

export async function getAllUser() {
  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
    },
    select: userPublicInfo,
  });
  return users;
}

export async function getUserRecover(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gte: new Date() },
    },
    select: userPublicInfo,
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

export async function editPictureById({
  id,
  picture,
}: {
  id: string;
  picture: {
    type: "base64" | "url";
    data: string;
  };
}): Promise<boolean> {
  let url: string | undefined;
  if (picture.type == "base64" && isBase64Data(picture.data)) {
    const { asset_id, height, public_id, secure_url, tags, width } =
      await uploadImageCloudinary(picture.data);

    console.log(secure_url);
    url = secure_url;
  }
  if (
    picture.type == "url" &&
    z.string().url().safeParse(picture.data).success
  ) {
    url = picture.data;
  }
  if (url) {
    await prisma.user.update({
      where: {
        id,
      },
      data: {
        picture: url,
      },
    });
    return true;
  }

  return false;
}

export async function editUserById(
  id: string,
  data: Omit<Prisma.UserUpdateInput, "Post" | "linkProvider">
) {
  return await prisma.user.update({
    where: {
      id,
    },
    data: data,
  });
}

export async function createUser(
  data: Omit<Prisma.UserCreateInput, "Post" | "linkProvider">
) {
  return await prisma.user.create({
    data,
  });
}
