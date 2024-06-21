import {
  changPassword,
  changeEmail,
  currentUser,
  disactivate,
  edit,
  sendVerifyEmail,
} from "@/controllers/user.controller";
import { rateLimitSendEmail } from "@/middleware/rateLimit";
import { checkActive, requiredAuth } from "@/middleware/requiredAuth";
import validateResource from "@/middleware/validateResource";
import { changePassword, editProfileSchema } from "@/schemas/user.schema";
import express, { type Router } from "express";
const router: Router = express.Router();
function userRouter(): Router {
  router.get("/users/me", requiredAuth, checkActive, currentUser);
  router.patch("/users/disactivate", requiredAuth, checkActive, disactivate);
  router.patch(
    "/users/change-password",
    requiredAuth,
    checkActive,
    validateResource(changePassword),
    changPassword
  );
  router.patch(
    "/users",
    requiredAuth,
    checkActive,
    validateResource(editProfileSchema),
    edit
  );

  router.get(
    "/users/send-verify-email",
    requiredAuth,
    checkActive,
    rateLimitSendEmail,
    sendVerifyEmail
  );

  router.patch("/users/change-email", requiredAuth, checkActive, changeEmail);
  return router;
}

export default userRouter();
