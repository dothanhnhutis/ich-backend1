import {
  changeEmail,
  creatUser,
  currentUser,
  disactivate,
  edit,
  editAvatar,
  editPassword,
  getUser,
  sendVerifyEmail,
} from "@/controllers/user.controller";
import { rateLimitSendEmail } from "@/middleware/rateLimit";
import { checkActive, requiredAuth } from "@/middleware/requiredAuth";
import validateResource from "@/middleware/validateResource";
import {
  creatUserSchema,
  editPasswordSchema,
  editProfileSchema,
} from "@/schemas/user.schema";
import express, { type Router } from "express";
const router: Router = express.Router();
function userRouter(): Router {
  router.get(
    "/users/send-verify-email",
    requiredAuth,
    checkActive,
    rateLimitSendEmail,
    sendVerifyEmail
  );
  router.get("/users/me", requiredAuth, checkActive, currentUser);
  router.get("/users", getUser);
  router.post("/users", validateResource(creatUserSchema), creatUser);

  router.patch("/users/disactivate", requiredAuth, checkActive, disactivate);
  router.post(
    "/users/password",
    requiredAuth,
    checkActive,
    validateResource(editPasswordSchema),
    editPassword
  );
  router.post("/users/picture", requiredAuth, checkActive, editAvatar);

  router.patch(
    "/users",
    requiredAuth,
    checkActive,
    validateResource(editProfileSchema),
    edit
  );

  router.patch("/users/change-email", requiredAuth, checkActive, changeEmail);
  return router;
}

export default userRouter();
