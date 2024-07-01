import {
  changeEmail,
  creatNewUser,
  currentUser,
  disactivate,
  editProfile,
  editAvatar,
  editPassword,
  getUser,
  sendVerifyEmail,
  editUser,
  getUserTest,
} from "@/controllers/user.controller";
import { rateLimitSendEmail } from "@/middleware/rateLimit";
import {
  authMiddleware,
  checkActive,
  requiredAuth,
} from "@/middleware/requiredAuth";
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
    authMiddleware(["isActive", "isBlocked"]),
    rateLimitSendEmail,
    sendVerifyEmail
  );
  router.get(
    "/users/me",
    authMiddleware(["isActive", "isBlocked"]),
    currentUser
  );

  router.get("/users/test", getUserTest);
  router.get("/users", getUser);
  router.post("/users", validateResource(creatUserSchema), creatNewUser);
  router.patch("/users", validateResource(creatUserSchema), editUser);

  router.patch(
    "/users/disactivate",
    authMiddleware(["emailVerified", "isActive", "isBlocked"]),
    disactivate
  );
  router.post(
    "/users/password",
    authMiddleware(["emailVerified", "isActive", "isBlocked"]),
    validateResource(editPasswordSchema),
    editPassword
  );
  router.post("/users/picture", requiredAuth, checkActive, editAvatar);

  router.patch(
    "/users",
    authMiddleware(["emailVerified", "isActive", "isBlocked"]),
    validateResource(editProfileSchema),
    editProfile
  );

  router.patch("/users/change-email", requiredAuth, checkActive, changeEmail);
  return router;
}

export default userRouter();
