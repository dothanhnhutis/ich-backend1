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
import {
  activeUserByToken,
  createUserWithEmailAndPass,
  generateReactiveTokenById,
  generateRecoverTokenById,
  getUSerByActiveToken,
  getUserByEmail,
  getUserByRecoverToken,
  getUserByVerificationToken,
  getUserPasswordByEmail,
  updatePasswordById,
  verifyEmailByToken,
} from "@/services/user.service";
import { parse } from "cookie";
import { signJWT, verifyJWT } from "@/utils/jwt";
import {
  getGoogleProvider,
  linkAccountWithGoogleProvider,
} from "@/services/link.service";

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
const SUCCESS_REDIRECT = `${configs.CLIENT_URL}/account/profile`;
const ERROR_REDIRECT = `${configs.CLIENT_URL}/auth/error`;
const RECOVER_SESSION_NAME = "eid";

export async function signInGoogle(
  req: Request<{}, {}, {}, { redir?: string }>,
  res: Response
) {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ],
    state: req.query.redir || undefined,
    prompt: "consent",
  });
  return res.redirect(url);
}

export async function signInGoogleCallBack(
  req: Request<{}, {}, {}, { code?: string; error?: string; state: string }>,
  res: Response
) {
  const { code, error, state } = req.query;
  console.log(req.query);
  if (error) res.redirect(ERROR_REDIRECT);

  if (code) {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });

    const userInfo = (await oauth2.userinfo.get()).data as GoogleUserInfo;
    let userProvider = await getGoogleProvider(userInfo.id);

    if (!userProvider) {
      const existAccount = await getUserByEmail(userInfo.email);
      console.log(state);

      if (existAccount) {
        return res
          .cookie(
            "oauth2",
            JSON.stringify({
              type: "nolink",
              email: state == "/auth/signin" ? userInfo.email : "",
            }),
            {
              httpOnly: false,
              path: "/auth",
              secure: configs.NODE_ENV == "production",
            }
          )
          .redirect(`${configs.CLIENT_URL}/auth/signin`);
      }

      const data: Prisma.UserCreateInput = {
        email: userInfo.email,
        emailVerified: userInfo.verified_email,
        username: userInfo.name,
        picture: userInfo.picture,
      };
      if (!userInfo.verified_email) {
        const randomBytes: Buffer = await Promise.resolve(
          crypto.randomBytes(20)
        );
        const randomCharacters: string = randomBytes.toString("hex");
        const date: Date = new Date(Date.now() + 24 * 60 * 60000);
        data.emailVerificationToken = randomCharacters;
        data.emailVerificationExpires = date;
      }

      const user = await prisma.user.create({
        data,
      });

      userProvider = await linkAccountWithGoogleProvider(userInfo.id, user.id);
    }

    if (userProvider.user.suspended)
      throw new BadRequestError(
        "Your account has been locked please contact the administrator"
      );

    if (!userProvider.user.inActive)
      throw new BadRequestError("Your account has been disactivate");

    req.session.user = {
      id: userProvider.user.id,
    };
    req.session.cookie.expires = new Date(Date.now() + SESSION_MAX_AGE);

    return res.redirect(SUCCESS_REDIRECT);
  }
}

export async function signIn(
  req: Request<{}, {}, SignIn["body"]>,
  res: Response
) {
  const { email, password } = req.body;
  const user = await getUserPasswordByEmail(email);
  console.log(user);

  if (!user || !user.password || !(await compareData(user.password, password)))
    throw new BadRequestError("Invalid email or password");
  if (user.suspended)
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
  const user = await getUserByEmail(email);
  if (user) throw new BadRequestError("User already exists");

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  const randomCharacters: string = randomBytes.toString("hex");
  const date: Date = new Date(Date.now() + 24 * 60 * 60000);

  const token = signJWT(
    {
      session: randomCharacters,
      iat: Math.floor(date.getTime() / 1000),
    },
    configs.JWT_SECRET
  );

  const verificationLink = `${configs.CLIENT_URL}/auth/confirm-email?token=${token}`;
  await createUserWithEmailAndPass(
    username,
    email,
    password,
    randomCharacters,
    date
  );

  // await sendMail({
  //   template: emaiEnum.VERIFY_EMAIL,
  //   receiver: email,
  //   locals: {
  //     username,
  //     verificationLink,
  //   },
  // });

  return res.status(StatusCodes.CREATED).send({
    message:
      "Sign up success. A confirmation email will be sent to your email address.",
  });
}

export async function verifyEmail(
  req: Request<VerifyEmail["params"]>,
  res: Response
) {
  const { token } = req.params;
  const data = verifyJWT<{ session: string }>(token, configs.JWT_SECRET);
  if (!data) throw new NotFoundError();
  const user = await getUserByVerificationToken(data.session);
  if (!user) throw new NotFoundError();
  await verifyEmailByToken(data.session);

  return res.status(StatusCodes.OK).json({
    message: "verify email success",
  });
}

export async function recover(
  req: Request<{}, {}, SendRecoverEmail["body"]>,
  res: Response
) {
  const { email } = req.body;
  const existingUser = await getUserByEmail(email);
  if (!existingUser) throw new BadRequestError("Invalid email");
  if (!existingUser.emailVerified)
    throw new BadRequestError(
      "Please verify your email address after using password recovery"
    );

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  let randomCharacters = existingUser.passwordResetToken;
  let date = existingUser.passwordResetExpires;

  if (!randomCharacters || !date || date.getTime() < Date.now()) {
    randomCharacters = randomBytes.toString("hex");
    date = new Date(Date.now() + 4 * 60 * 60000);
    await generateRecoverTokenById(existingUser.id, {
      passwordResetToken: randomCharacters,
      passwordResetExpires: date,
    });
  }
  const token = signJWT(
    {
      session: randomCharacters,
      iat: Math.floor(date.getTime() / 1000),
    },
    configs.JWT_SECRET
  );
  const recoverLink = `${configs.CLIENT_URL}/auth/reset-password?token=${token}`;
  // await sendMail({
  //   template: emaiEnum.RECOVER_ACCOUNT,
  //   receiver: email,
  //   locals: {
  //     username: existingUser.username,
  //     recoverLink,
  //   },
  // });

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
  const data = verifyJWT<{ session: string }>(token, configs.JWT_SECRET);
  if (!data) throw new BadRequestError("Reset token has expired");

  const existingUser = await getUserByRecoverToken(data.session);
  if (!existingUser) throw new BadRequestError("Reset token has expired");
  await updatePasswordById(existingUser.id, password);

  return res.status(StatusCodes.OK).send({
    message: "Reset password success",
  });
}

export async function checkDisactivedAccount(
  req: Request<{}, {}, CheckEmailDisactive["body"]>,
  res: Response
) {
  const { email } = req.body;
  const user = await getUserByEmail(email);

  if (!user)
    return res.clearCookie(RECOVER_SESSION_NAME).status(StatusCodes.OK).json({
      message: "You can use this email to register for an account",
    });

  if (user.inActive)
    return res.clearCookie(RECOVER_SESSION_NAME).status(StatusCodes.OK).json({
      message: "Your account is active",
    });

  const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
  let randomCharacters = user.activeToken;
  let date = user.activeExpires;
  if (
    !randomCharacters ||
    randomCharacters == "" ||
    !date ||
    date.getTime() <= Date.now()
  ) {
    randomCharacters = randomBytes.toString("hex");
    date = new Date(Date.now() + 5 * 60000);
    await generateReactiveTokenById(user.id, {
      activeToken: randomCharacters,
      activeExpires: date,
    });
  }

  const token = signJWT(
    {
      session: randomCharacters,
      iat: Math.floor(date.getTime() / 1000),
    },
    configs.JWT_SECRET
  );

  return res
    .status(StatusCodes.BAD_REQUEST)
    .cookie(RECOVER_SESSION_NAME, token, { expires: date })
    .json({ message: "Your account is currently closed" });
}

export async function sendReactivateAccount(req: Request, res: Response) {
  const cookies = parse(req.get("cookie") || "");
  if (!cookies[RECOVER_SESSION_NAME]) throw new NotFoundError();
  const data = verifyJWT<{ session: string }>(
    cookies[RECOVER_SESSION_NAME],
    configs.JWT_SECRET
  );
  if (!data) throw new NotFoundError();

  const existingUser = await getUSerByActiveToken(data.session);

  if (!existingUser) throw new NotFoundError();
  console.log(cookies[RECOVER_SESSION_NAME]);

  const reactivateLink = `${configs.CLIENT_URL}/auth/reactivate?token=${cookies[RECOVER_SESSION_NAME]}`;
  // await sendMail({
  //   template: emaiEnum.REACTIVATE_ACCOUNT,
  //   receiver: existingUser.email,
  //   locals: {
  //     username: existingUser.username,
  //     reactivateLink,
  //   },
  // });
  return res.clearCookie(RECOVER_SESSION_NAME).status(StatusCodes.OK).send({
    message: "Send email success",
  });
}

export async function reactivateAccount(
  req: Request<ReactivateAccount["params"]>,
  res: Response
) {
  const { token } = req.params;
  const data = verifyJWT<{ session: string }>(token, configs.JWT_SECRET);
  if (!data) throw new NotFoundError();
  const user = await await getUSerByActiveToken(data.session);

  if (!user) throw new NotFoundError();
  await activeUserByToken(data.session);

  return res.status(StatusCodes.OK).send({
    message: "reactivateAccount",
  });
}
