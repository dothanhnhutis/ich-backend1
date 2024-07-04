import {
  changeEmail,
  currentUser,
  disactivate,
  editProfile,
  editAvatar,
  editPassword,
  getUser,
  sendVerifyEmail,
  getUserRecoverToken,
  searchUser,
} from "@/controllers/user.controller";
import checkPermission from "@/middleware/checkPermission";
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
  searchUserSchema,
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

  router.get("/users/recover/:token", getUserRecoverToken);
  router.get(
    "/users",
    authMiddleware(["emailVerified", "isActive", "isBlocked"]),
    checkPermission(["ADMIN"]),
    getUser
  );

  router.get(
    "/users/_search",
    authMiddleware(["emailVerified", "isActive", "isBlocked"]),
    checkPermission(["ADMIN"]),
    validateResource(searchUserSchema),
    searchUser
  );
  // router.get("/users/test", getUserTest);
  // router.post("/users", validateResource(creatUserSchema), creatNewUser);
  // router.patch("/users", validateResource(creatUserSchema), editUser);

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
