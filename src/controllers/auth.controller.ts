import crypto from "crypto";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import prisma from "@/utils/db";
import configs from "@/configs";
import { compareData, hashData } from "@/utils/helper";
import { BadRequestError, NotFoundError } from "@/error-handler";
import {
  CheckEmailDisactive,
  ReactivateAccount,
  ResetPassword,
  SendRecoverEmail,
  SignIn,
  SignUp,
  VerifyEmail,
} from "@/schemas/auth.schema";
import { emaiEnum, sendMail } from "@/utils/nodemailer";
import { google } from "googleapis";
import { Prisma } from "@prisma/client";
import { generateReactiveToken, getUserByEmail } from "@/services/user.service";
import { parse } from "cookie";

type GoogleUserInfo = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
};

const GOOGLE_REDIRECT_URI = `${configs.SERVER_URL}/api/v1/auth/google/callback`;
const oAuth2Client = new google.auth.OAuth2(
  configs.GOOGLE_CLIENT_ID,
  configs.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const SESSION_MAX_AGE = 30 * 24 * 60 * 60000;

export async function signInGoogle(req: Request, res: Response) {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ],
    prompt: "consent",
  });
  res.redirect(url);
}

export async function signInGoogleCallBack(
  req: Request<{}, {}, {}, { code: string }>,
  res: Response
) {
  const { code } = req.query;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: oAuth2Client,
    version: "v2",
  });

  const userInfo = (await oauth2.userinfo.get()).data as GoogleUserInfo;
  let userProvider = await prisma.linkProvider.findUnique({
    where: {
      provider_providerId: {
        provider: "google",
        providerId: userInfo.id,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          isBlocked: true,
          emailVerified: true,
          isActive: true,
        },
      },
    },
  });

  if (!userProvider) {
    const data: Prisma.UserCreateInput = {
      email: userInfo.email,
      emailVerified: userInfo.verified_email,
      username: userInfo.name,
      picture: userInfo.picture,
    };
    if (!userInfo.verified_email) {
      const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
      const randomCharacters: string = randomBytes.toString("hex");
      const date: Date = new Date(Date.now() + 24 * 60 * 60000);
      data.emailVerificationToken = randomCharacters;
      data.emailVerificationExpires = date;
    }

    const user = await prisma.user.create({
      data,
    });

    userProvider = await prisma.linkProvider.create({
      data: {
        provider: "google",
        providerId: userInfo.id,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isBlocked: true,
            emailVerified: true,
            isActive: true,
          },
        },
      },
    });
  }

  if (userProvider.user.isBlocked)
    throw new BadRequestError(
      "Your account has been locked please contact the administrator"
    );

  if (!userProvider.user.isActive)
    throw new BadRequestError("Your account has been disactivate");

  req.session.user = {
    id: userProvider.user.id,
  };
  req.session.cookie.expires = new Date(Date.now() + SESSION_MAX_AGE);

  res.redirect(`${configs.CLIENT_URL}/user/profile`);
}

export async function signIn(
  req: Request<{}, {}, SignIn["body"]>,
  res: Response
) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.password || !(await compareData(user.password, password)))
    throw new BadRequestError("Invalid email or password");

  if (user.isBlocked)
    throw new BadRequestError(
      "Your account has been locked please contact the administrator"
    );

  req.session.user = {
    id: user.id,
  };
  req.session.cookie.expires = new Date(Date.now() + SESSION_MAX_AGE);
  return res.status(StatusCodes.OK).json({ message: "Sign in success" });
}

export async function signOut(req: Request, res: Response) {
  await req.logout();
  res
    .status(StatusCodes.OK)
    .json({
      message: "Sign out successful",
    })
    .end();
}

export async function signUp(
  req: Request<{}, {}, SignUp["body"]>,
  res: Response
) {
  const { email, password, username } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) throw new BadRequestError("User already exists");

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters: string = randomBytes.toString("hex");
  const verificationLink = `${configs.CLIENT_URL}/confirm-email?v_token=${randomCharacters}`;
  const date: Date = new Date(Date.now() + 24 * 60 * 60000);

  const hash = hashData(password);
  await prisma.user.create({
    data: {
      email: email,
      password: hash,
      username,
      emailVerificationToken: randomCharacters,
      emailVerificationExpires: date,
    },
  });

  await sendMail({
    template: emaiEnum.VERIFY_EMAIL,
    receiver: email,
    locals: {
      username,
      verificationLink,
    },
  });

  return res.status(StatusCodes.CREATED).send({
    message: "Sign up success",
  });
}

export async function verifyEmail(
  req: Request<VerifyEmail["params"]>,
  res: Response
) {
  const { token } = req.params;
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });
  if (
    !user ||
    user.emailVerified ||
    !user.emailVerificationExpires ||
    user.emailVerificationExpires.getTime() < Date.now()
  )
    throw new NotFoundError();
  await prisma.user.update({
    where: { emailVerificationToken: token },
    data: {
      emailVerified: true,
    },
  });
  return res.status(StatusCodes.OK).json({
    message: "verify email success",
  });
}

export async function recover(
  req: Request<{}, {}, SendRecoverEmail["body"]>,
  res: Response
) {
  const { email } = req.body;
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!existingUser) throw new BadRequestError("Invalid email");
  if (!existingUser.emailVerified)
    throw new BadRequestError(
      "Please verify your email address after using password recovery"
    );

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters: string = randomBytes.toString("hex");
  const date: Date = new Date(Date.now() + 4 * 60 * 60000);
  await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      passwordResetToken: randomCharacters,
      passwordResetExpires: date,
    },
  });
  const recoverLink = `${configs.CLIENT_URL}/auth/reset-password?token=${randomCharacters}`;
  await sendMail({
    template: emaiEnum.RECOVER_ACCOUNT,
    receiver: email,
    locals: {
      username: existingUser.username,
      recoverLink,
    },
  });

  return res.status(StatusCodes.OK).send({
    message: "Send email success",
  });
}

export async function resetPassword(
  req: Request<ResetPassword["params"], {}, ResetPassword["body"]>,
  res: Response
) {
  const { token } = req.params;
  const { password } = req.body;
  const existingUser = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gte: new Date() },
    },
  });
  if (!existingUser) throw new BadRequestError("Reset token has expired");
  const hash = hashData(password);
  await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      password: hash,
      passwordResetExpires: null,
      passwordResetToken: null,
    },
  });
  return res.status(StatusCodes.OK).send({
    message: "Reset password success",
  });
}

export async function checkActiveAccount(
  req: Request<{}, {}, CheckEmailDisactive["body"]>,
  res: Response
) {
  const { email } = req.body;
  const user = await getUserByEmail(email);
  if (!user || user.isActive)
    throw new BadRequestError("Your account is active or not sign in");

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  let randomCharacters: string = user.activeToken || "";
  let date: Date = user.activeExpires || new Date();
  if (
    user.activeToken == "" ||
    !user.activeExpires ||
    user.activeExpires.getTime() <= Date.now()
  ) {
    randomCharacters = randomBytes.toString("hex");
    date = new Date(Date.now() + 4 * 60 * 60000);
    await generateReactiveToken(user.id, {
      activeToken: randomCharacters,
      activeExpires: date,
    });
  }
  return res
    .status(StatusCodes.OK)
    .cookie("eid", randomCharacters, { expires: date })
    .json({ message: "Your account is currently closed" });
}

export async function sendReactivateAccount(req: Request, res: Response) {
  const cookies = parse(req.get("cookie") || "");
  const existingUser = await prisma.user.findUnique({
    where: {
      activeToken: cookies["eid"] || "",
      activeExpires: { gte: new Date() },
    },
  });

  if (!existingUser) throw new NotFoundError();
  // if (!existingUser.emailVerified)
  //   throw new BadRequestError(
  //     "Please verify your email address after using password recovery"
  //   );

  const reactivateLink = `${configs.CLIENT_URL}/auth/reactivate?token=${existingUser.activeToken}`;
  await sendMail({
    template: emaiEnum.REACTIVATE_ACCOUNT,
    receiver: existingUser.email,
    locals: {
      username: existingUser.username,
      reactivateLink,
    },
  });
  return res.clearCookie("eid").status(StatusCodes.OK).send({
    message: "Send email success",
  });
}

export async function reactivateAccount(
  req: Request<ReactivateAccount["params"]>,
  res: Response
) {
  const { token } = req.params;
  const user = await prisma.user.findUnique({
    where: { activeToken: token },
  });
  if (!user) throw new NotFoundError();
  await prisma.user.update({
    where: { activeToken: token },
    data: {
      isActive: true,
    },
  });

  return res.status(StatusCodes.OK).send({
    message: "reactivateAccount",
  });
}
