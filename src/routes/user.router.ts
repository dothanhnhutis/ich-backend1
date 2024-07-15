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
  search,
  creatNewUser,
  getUsers,
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
    authMiddleware(["inActive", "suspended"]),
    rateLimitSendEmail,
    sendVerifyEmail
  );
  router.get(
    "/users/me",
    authMiddleware(["inActive", "suspended"]),
    currentUser
  );

  router.get("/users/recover/:token", getUserRecoverToken);
  router.get(
    "/users",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    checkPermission(["ADMIN"]),
    getUsers
  );

  router.get(
    "/users/_search",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    checkPermission(["ADMIN"]),
    validateResource(searchUserSchema),
    search
  );

  router.post(
    "/users",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    checkPermission(["ADMIN"]),
    validateResource(creatUserSchema),
    creatNewUser
  );
  // router.patch("/users", validateResource(creatUserSchema), editUser);

  router.patch(
    "/users/disactivate",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    disactivate
  );
  router.post(
    "/users/password",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    validateResource(editPasswordSchema),
    editPassword
  );
  router.post("/users/picture", requiredAuth, checkActive, editAvatar);

  router.patch(
    "/users",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    validateResource(editProfileSchema),
    editProfile
  );

  router.patch("/users/change-email", requiredAuth, checkActive, changeEmail);
  router.get(
    "/users/:id",
    authMiddleware(["emailVerified", "inActive", "suspended"]),
    checkPermission(["ADMIN"]),
    getUser
  );
  return router;
}

export default userRouter();
