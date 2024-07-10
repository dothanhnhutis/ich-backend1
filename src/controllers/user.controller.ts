import { query, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  CreateUser,
  EditPassword,
  EditPicture,
  EditProfile,
  EditUser,
  SearchUser,
} from "@/schemas/user.schema";
import { BadRequestError, NotFoundError } from "@/error-handler";
import { compareData, hashData } from "@/utils/helper";
import configs from "@/configs";
import crypto from "crypto";
import { emaiEnum, sendMail } from "@/utils/nodemailer";
import {
  createUser,
  editUserById,
  getAllUser,
  getUserByEmail,
  getUserById,
  getUserByRecoverToken,
  getUserPrivateById,
  searchUser,
} from "@/services/user.service";
import { Prisma } from "@prisma/client";
import { isBase64Data, uploadImageCloudinary } from "@/utils/image";
import { z } from "zod";
import { omit } from "lodash";
import { signJWT, verifyJWT } from "@/utils/jwt";
import { UserRole } from "@/schemas/auth.schema";

export async function search(
  req: Request<{}, {}, SearchUser["body"], SearchUser["query"]>,
  res: Response
) {
  return res.status(StatusCodes.OK).json(
    await searchUser({
      ...req.query,
      ...req.body,
    })
  );
}

export async function getUserRecoverToken(
  req: Request<{ token: string }>,
  res: Response
) {
  const { token } = req.params;
  const data = verifyJWT<{
    session: string;
  }>(token, configs.JWT_SECRET);
  if (!data) throw new NotFoundError();
  const user = await getUserByRecoverToken(data.session);
  if (!user) throw new NotFoundError();
  return res.status(StatusCodes.OK).json(user);
}

export async function getUser(req: Request, res: Response) {
  const users = await getAllUser();
  return res.status(200).json(users);
}

export async function currentUser(req: Request, res: Response) {
  res.status(StatusCodes.OK).json(req.user);
}

export async function disactivate(req: Request, res: Response) {
  const { id } = req.session.user!;
  await editUserById(id, {
    inActive: false,
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
  const { id } = req.user!;
  const userExist = await getUserPrivateById(id);
  if (!userExist) throw new BadRequestError("User not exist");

  const isValidOldPassword = await compareData(
    userExist.password!,
    oldPassword
  );

  if (!isValidOldPassword)
    throw new BadRequestError("Old password is incorrect");

  if (oldPassword != newPassword)
    await editUserById(id, {
      password: hashData(newPassword),
    });

  return res.status(StatusCodes.OK).json({
    message: "Edit password success",
  });
}

export async function editProfile(
  req: Request<{}, {}, EditProfile["body"]>,
  res: Response
) {
  const { id } = req.session.user!;
  await editUserById(id, req.body);
  return res.status(StatusCodes.OK).json({ message: "Edit profile success" });
}

export async function editUser(
  req: Request<EditUser["params"], {}, EditUser["body"]>,
  res: Response
) {
  const { id } = req.params;
  const user = await getUserById(id);
  if (!user) throw new NotFoundError();

  let data: Omit<Prisma.UserUpdateInput, "Post"> = {};

  if (req.body.password) {
    data.password = hashData(req.body.password);
  }

  if (req.body.email) {
    const userExist = await getUserByEmail(req.body.email);
    if (!userExist) throw new BadRequestError("email already exists");
    data.email = req.body.email;
    data.emailVerified = false;
  }

  if (req.body.picture) {
    let url: string;
    if (
      req.body.picture.pictureType == "base64" &&
      isBase64Data(req.body.picture.pictureData)
    ) {
      const { asset_id, height, public_id, secure_url, tags, width } =
        await uploadImageCloudinary(req.body.picture.pictureData);
      url = secure_url;
    } else if (
      req.body.picture.pictureType == "url" &&
      z.string().url().safeParse(req.body.picture.pictureData).success
    ) {
      url = req.body.picture.pictureData;
    } else {
      throw new BadRequestError("edit picture fail");
    }
    data.picture = url;
  }
  data = {
    ...data,
    ...omit(req.body, ["picture", "email", "password"]),
  };

  return res.status(StatusCodes.OK).json({
    message: "Edit user success",
    userawait: await editUserById(id, data),
  });
}

export async function changeEmail(
  req: Request<{}, {}, { email: string }>,
  res: Response
) {
  const { email } = req.body;
  const { id } = req.session.user!;

  const user = await getUserById(id);
  if (!user) throw new NotFoundError();

  if (email == user.email)
    throw new BadRequestError(
      "The new email cannot be the same as the old email"
    );

  const checkNewEmail = await getUserByEmail(email);
  if (!checkNewEmail) throw new BadRequestError("Email already exists");

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters = randomBytes.toString("hex");
  const date = new Date(Date.now() + 24 * 60 * 60000);

  await editUserById(id, {
    email,
    emailVerified: false,
    emailVerificationExpires: date,
    emailVerificationToken: randomCharacters,
  });

  const token = signJWT(
    {
      session: randomCharacters,
      iat: Math.floor(date.getTime() / 1000),
    },
    configs.JWT_SECRET
  );
  const verificationLink = `${configs.CLIENT_URL}/confirm-email?token=${token}`;

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
  const user = await getUserPrivateById(id);

  if (!user) throw new NotFoundError();
  // let verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?token=${user.emailVerificationToken}`;
  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  let randomCharacters = user.emailVerificationToken;
  let date = user.emailVerificationExpires;

  if (!randomCharacters || !date || date.getTime() < Date.now()) {
    randomCharacters = randomBytes.toString("hex");
    date = new Date(Date.now() + 24 * 60 * 60000);
    await editUserById(id, {
      emailVerificationToken: randomCharacters,
      emailVerificationExpires: date,
    });
  }

  const token = signJWT(
    {
      session: randomCharacters,
      iat: Math.floor(date.getTime() / 1000),
    },
    configs.JWT_SECRET
  );
  const verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?token=${token}`;

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
  let url: string;
  if (pictureType == "base64" && isBase64Data(pictureData)) {
    const { asset_id, height, public_id, secure_url, tags, width } =
      await uploadImageCloudinary(pictureData);
    url = secure_url;
  } else if (
    pictureType == "url" &&
    z.string().url().safeParse(pictureData).success
  ) {
    url = pictureData;
  } else {
    throw new BadRequestError("edit picture fail");
  }
  return res.send({
    message: (await editUserById(id, {
      picture: url,
    }))
      ? "Update picture success"
      : "Update picture fail",
  });
}

export async function creatNewUser(
  req: Request<{}, {}, CreateUser["body"]>,
  res: Response
) {
  const { email, password, username, role, ...other } = req.body;

  const user = await getUserByEmail(email);
  if (user) throw new BadRequestError("Email has been used");
  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters: string = randomBytes.toString("hex");
  const verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?v_token=${randomCharacters}`;
  const date: Date = new Date(Date.now() + 24 * 60 * 60000);

  const hash = hashData(password);
  await createUser({
    email: email,
    password: hash,
    username,
    role,
    emailVerificationToken: randomCharacters,
    emailVerificationExpires: date,
    ...other,
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
