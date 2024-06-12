import {
  recover,
  signIn,
  signOut,
  signUp,
  verifyEmail,
  resetPassword,
  // signInGoogleCallBack,
  signInGoogle,
  signInGoogleCallBack,
} from "@/controllers/auth.controller";
import { rateLimitRecover } from "@/middleware/rateLimit";
import validateResource from "@/middleware/validateResource";
import {
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

  router.post("/auth/signin", validateResource(signinSchema), signIn);
  router.delete("/auth/signout", signOut);
  router.post("/auth/signup", validateResource(signupSchema), signUp);
  router.get(
    "/auth/confirm-email/:token",
    validateResource(verifyEmailSchema),
    verifyEmail
  );

  router.patch(
    "/recover",
    rateLimitRecover,
    validateResource(sendRecoverEmailSchema),
    recover
  );

  router.patch(
    "/reset-password/:token",
    validateResource(resetPasswordSchema),
    resetPassword
  );
  return router;
}

export default authRouter();
