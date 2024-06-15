import {
  changPassword,
  currentUser,
  disactivate,
  edit,
} from "@/controllers/user.controller";
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
  return router;
}

export default userRouter();
