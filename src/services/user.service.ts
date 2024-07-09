import { Role } from "@/schemas/user.schema";
import prisma from "@/utils/db";
import { hashData } from "@/utils/helper";
import { isBase64Data, uploadImageCloudinary } from "@/utils/image";
import { Prisma } from "@prisma/client";
import { omit } from "lodash";
import { z } from "zod";

export const userPublicInfo = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  emailVerified: true,
  role: true,
  inActive: true,
  username: true,
  suspended: true,
  phone: true,
  picture: true,
  address: true,
  createdAt: true,
  updatedAt: true,
});

export const userPrivateInfo = Prisma.validator<Prisma.UserSelect>()({
  password: true,
  linkProvider: {
    select: {
      provider: true,
    },
  },
});

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
  emails?: string[] | undefined;
  roles?: Role[] | undefined;
  emailVerified?: boolean | undefined;
  inActive?: boolean | undefined;
  suspended?: boolean | undefined;
  orderBy?: string | undefined;
  page?: number | undefined;
  take?: number | undefined;
};

export function convertStringToOrderArray(input: string) {
  const pairs = input.split(",");
  return pairs.map((pair) => {
    const [field, order] = pair.split(".");
    return { [field]: order };
  });
}

export async function queryUser(props?: QueryUserType | undefined) {
  const take = props?.take || 10;
  const page = (!props?.page || props.page <= 0 ? 1 : props.page) - 1;
  const skip = page * take;

  let where: Prisma.UserWhereInput = {};

  if (props?.emails) {
    where = {
      ...where,
      email: {
        in: props.emails,
      },
    };
  }
  if (props?.roles) {
    where = {
      ...where,
      role: {
        in: props.roles,
      },
    };
  }
  if (props?.emailVerified) {
    where = {
      ...where,
      emailVerified: props.emailVerified,
    };
  }
  if (props?.inActive) {
    where = {
      ...where,
      inActive: props.inActive,
    };
  }
  if (props?.suspended) {
    where = {
      ...where,
      suspended: props.suspended,
    };
  }
  console.log(where);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      take,
      skip,
      orderBy: props?.orderBy
        ? convertStringToOrderArray(props?.orderBy)
        : undefined,
      select: { ...userPublicInfo, ...userPrivateInfo },
    }),
    prisma.user.count({ where: where }),
  ]);

  const usersNoPass = users.map((user) => {
    const isCerdential: boolean = user.password == null ? false : true;
    if (!isCerdential) {
      return omit(user, ["password"]);
    }
    user.linkProvider = [
      {
        provider: "credential",
      },
      ...user.linkProvider,
    ];
    return user;
  });

  return {
    users: usersNoPass,
    metadata: {
      hasNextPage: skip + take < total,
      totalPage: Math.ceil(total / take),
      totalItem: total,
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
      suspended: true,
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
      inActive: true,
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
