import {
  recover,
  signIn,
  signOut,
  signUp,
  verifyEmail,
  resetPassword,
  signInGoogle,
  signInGoogleCallBack,
  reactivateAccount,
  sendReactivateAccount,
  checkDisactivedAccount,
} from "@/controllers/auth.controller";
import { rateLimitRecover } from "@/middleware/rateLimit";
import validateResource from "@/middleware/validateResource";
import {
  checkEmailCheckSchema,
  reactivateAccountSchema,
  resetPasswordSchema,
  sendRecoverEmailSchema,
  signinSchema,
  signupSchema,
  verifyEmailSchema,
} from "@/schemas/auth.schema";
import express, { type Router } from "express";

const router: Router = express.Router();
function authRouter(): Router {
  router.get("/auth/google", signInGoogle);
  router.get("/auth/google/callback", signInGoogleCallBack);

  router.post(
    "/auth/check/account",
    validateResource(checkEmailCheckSchema),
    checkDisactivedAccount
  );
  router.post("/auth/signin", validateResource(signinSchema), signIn);
  router.delete("/auth/signout", signOut);

  router.post("/auth/signup", validateResource(signupSchema), signUp);
  router.get(
    "/auth/confirm-email/:token",
    validateResource(verifyEmailSchema),
    verifyEmail
  );

  router.patch(
    "/auth/recover",
    rateLimitRecover,
    validateResource(sendRecoverEmailSchema),
    recover
  );
  router.patch(
    "/auth/reset-password/:token",
    validateResource(resetPasswordSchema),
    resetPassword
  );

  router.get(
    "/auth/reactivate/:token",
    validateResource(reactivateAccountSchema),
    reactivateAccount
  );
  router.get("/auth/reactivate", sendReactivateAccount);

  return router;
}

export default authRouter();
