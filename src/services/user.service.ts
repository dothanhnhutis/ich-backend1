import { Role } from "@/schemas/user.schema";
import prisma from "@/utils/db";
import { hashData } from "@/utils/helper";
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

//CREATE
export async function createUser(
  data: Omit<Prisma.UserCreateInput, "Post" | "linkProvider">
) {
  return await prisma.user.create({
    data,
  });
}

export async function createUserWithEmailAndPass(
  username: string,
  email: string,
  password: string,
  emailVerificationToken: string,
  emailVerificationExpires: Date
) {
  const hash = hashData(password);
  return await prisma.user.create({
    data: {
      email: email,
      password: hash,
      username,
      emailVerificationToken,
      emailVerificationExpires,
    },
  });
}

// READ
export type QueryUserType = {
  where?:
    | Pick<
        Prisma.UserWhereInput,
        "email" | "role" | "emailVerified" | "isActive" | "isBlocked"
      >
    | undefined;
  orderBy?:
    | {
        email?: "asc" | "desc" | undefined;
        role?: "asc" | "desc" | undefined;
        emailVerified?: "asc" | "desc" | undefined;
        isActive?: "asc" | "desc" | undefined;
        isBlocked?: "asc" | "desc" | undefined;
      }
    | undefined;
  page?: number | undefined;
  take?: number | undefined;
};
export async function queryUser(query?: QueryUserType | undefined) {
  const total = await prisma.user.count({});
  const take = query?.take || 10;
  const page = (!query?.page || query.page <= 0 ? 1 : query.page) - 1;
  const skip = page * take;

  const users = await prisma.user.findMany({
    where: query?.where,
    // orderBy: query?.orderBy,
    take,
    skip,
    select: userPublicInfo,
  });
  return {
    users,
    metadata: {
      hasNextPage: skip + take < total,
      totalPage: Math.ceil(total / take),
    },
  };
}

export async function getUserPasswordByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      isBlocked: true,
      email: true,
      password: true,
    },
  });
  return user;
}

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

export async function getUSerByActiveToken(token: string) {
  return await prisma.user.findUnique({
    where: {
      activeToken: token,
      activeExpires: { gte: new Date() },
    },
  });
}

export async function getUserByRecoverToken(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gte: new Date() },
    },
    select: userPublicInfo,
  });
  return user;
}

export async function getUserByVerificationToken(token: string) {
  const user = await prisma.user.findUnique({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gte: new Date() },
    },
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
// UPDATE

export async function verifyEmailByToken(token: string) {
  await prisma.user.update({
    where: { emailVerificationToken: token },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: new Date(),
    },
  });
}

export async function activeUserByToken(token: string) {
  await prisma.user.update({
    where: { activeToken: token },
    data: {
      isActive: true,
      activeExpires: new Date(),
      activeToken: null,
    },
  });
}

export async function updatePasswordById(id: string, password: string) {
  const hash = hashData(password);
  await prisma.user.update({
    where: {
      id,
    },
    data: {
      password: hash,
      passwordResetExpires: new Date(),
      passwordResetToken: null,
    },
  });
}
export async function generateRecoverTokenById(
  id: string,
  data: { passwordResetExpires: Date; passwordResetToken: string }
) {
  const user = await prisma.user.update({
    where: {
      id,
    },
    data,
  });
}

export async function generateReactiveTokenById(
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
