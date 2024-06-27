import { Request, Response } from "express";
import prisma from "@/utils/db";
import { StatusCodes } from "http-status-codes";
import { pick } from "lodash";
import {
  CreateUser,
  EditPassword,
  EditPicture,
  EditProfile,
} from "@/schemas/user.schema";
import { BadRequestError, NotFoundError } from "@/error-handler";
import { compareData, hashData } from "@/utils/helper";
import configs from "@/configs";
import crypto from "crypto";
import { emaiEnum, sendMail } from "@/utils/nodemailer";
import {
  editPictureById,
  getAllUser,
  getUserById,
  getUserByToken,
} from "@/services/user.service";

export async function getUser(
  req: Request<
    {},
    {},
    {},
    {
      tokenType: "reactivate" | "change-email" | "recover-password";
      token: string;
    }
  >,
  res: Response
) {
  const { token, tokenType } = req.query;
  if (token && tokenType) {
    const user = await getUserByToken(tokenType, token);
    if (!user) throw new NotFoundError();
    return res.status(200).json(user);
  } else {
    if (!req.session.user) throw new NotFoundError();
    const user = await getUserById(req.session.user.id);

    if (user!.role != "ADMIN") throw new NotFoundError();

    const users = await getAllUser();
    return res.status(200).json(users);
  }
}

export async function currentUser(req: Request, res: Response) {
  const { id } = req.session.user!;
  const user = await prisma.user.findUnique({
    where: { id },
  });
  res
    .status(StatusCodes.OK)
    .json(
      pick(user, [
        "id",
        "email",
        "emailVerified",
        "username",
        "picture",
        "role",
        "isActive",
        "isBlocked",
        "phone",
        "address",
        "createdAt",
        "updatedAt",
      ])
    );
}

export async function disactivate(req: Request, res: Response) {
  const { id } = req.session.user!;

  await prisma.user.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });

  await req.logout();

  res.status(StatusCodes.OK).json({
    message: "disactivate",
  });
}

export async function editPassword(
  req: Request<{}, {}, EditPassword["body"]>,
  res: Response
) {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.session.user!;
  const userExist = await prisma.user.findUnique({ where: { id } });
  if (!userExist) throw new BadRequestError("User not exist");
  const isValidOldPassword = await compareData(
    userExist.password!,
    oldPassword
  );

  if (!isValidOldPassword)
    throw new BadRequestError("Old password is incorrect");

  if (oldPassword != newPassword)
    await prisma.user.update({
      where: {
        id: userExist.id,
      },
      data: {
        password: hashData(newPassword),
      },
    });

  return res.status(StatusCodes.OK).json({
    message: "Edit password success",
  });
}

export async function edit(
  req: Request<{}, {}, EditProfile["body"]>,
  res: Response
) {
  const { id } = req.session.user!;
  const data = req.body;
  await prisma.user.update({
    where: {
      id,
    },
    data,
  });
  return res.status(StatusCodes.OK).json({ message: "Edit profile success" });
}

export async function changeEmail(
  req: Request<{}, {}, { email: string }>,
  res: Response
) {
  const { email } = req.body;
  const { id } = req.session.user!;

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!user) throw new BadRequestError("User not exist");

  const checkNewEmail = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (checkNewEmail) throw new BadRequestError("Email already exists");

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters: string = randomBytes.toString("hex");
  const verificationLink = `${configs.CLIENT_URL}/confirm-email?v_token=${randomCharacters}`;
  const date: Date = new Date(Date.now() + 24 * 60 * 60000);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      email,
      emailVerified: false,
      emailVerificationExpires: date,
      emailVerificationToken: randomCharacters,
    },
  });

  await sendMail({
    template: emaiEnum.VERIFY_EMAIL,
    receiver: email,
    locals: {
      username: user.username,
      verificationLink: verificationLink,
    },
  });

  return res.status(StatusCodes.OK).json({
    message: "Updated and resending e-mail...",
  });
}

export async function sendVerifyEmail(req: Request, res: Response) {
  const { id } = req.session.user!;
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      username: true,
      email: true,
      emailVerified: true,
      emailVerificationToken: true,
      emailVerificationExpires: true,
    },
  });

  if (!user) throw new BadRequestError("User not exist");
  let verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?v_token=${user.emailVerificationToken}`;
  if (
    !user.emailVerificationExpires ||
    user.emailVerificationExpires.getTime() < Date.now()
  ) {
    const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
    const randomCharacters: string = randomBytes.toString("hex");
    verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?v_token=${randomCharacters}`;
    const date: Date = new Date(Date.now() + 24 * 60 * 60000);
    await prisma.user.update({
      where: { id },
      data: {
        emailVerificationToken: randomCharacters,
        emailVerificationExpires: date,
      },
    });
  }

  await sendMail({
    template: emaiEnum.VERIFY_EMAIL,
    receiver: user.email,
    locals: {
      username: user.username,
      verificationLink,
    },
  });

  return res.status(StatusCodes.OK).json({
    message:
      "New verification email is successfully sent. Please, check your email...",
  });
}

export async function editAvatar(
  req: Request<{}, {}, EditPicture["body"]>,
  res: Response
) {
  const { id } = req.session.user!;
  const { pictureType, pictureData } = req.body;
  console.log(req.body);
  return res.send({
    message: (await editPictureById({
      id,
      picture: { type: pictureType, data: pictureData },
    }))
      ? "Update picture success"
      : "Update picture fail",
  });
}

export async function creatUser(
  req: Request<{}, {}, CreateUser["body"]>,
  res: Response
) {
  const { email, password, username, role, ...other } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) throw new BadRequestError("Email has been used");
  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters: string = randomBytes.toString("hex");
  const verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?v_token=${randomCharacters}`;
  const date: Date = new Date(Date.now() + 24 * 60 * 60000);

  const hash = hashData(password);
  await prisma.user.create({
    data: {
      email: email,
      password: hash,
      username,
      emailVerificationToken: randomCharacters,
      emailVerificationExpires: date,
      ...other,
    },
  });
  // await sendMail({
  //   template: emaiEnum.VERIFY_EMAIL,
  //   receiver: email,
  //   locals: {
  //     username,
  //     verificationLink,
  //   },
  // });
  return res.status(StatusCodes.OK).json({
    message: "create new user success",
  });
}
