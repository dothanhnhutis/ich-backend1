import { currentUser } from "@/controllers/user.controller";
import { checkActive, requiredAuth } from "@/middleware/requiredAuth";
import express, { type Router } from "express";
const router: Router = express.Router();
function userRouter(): Router {
  router.get("/users/me", requiredAuth, checkActive, currentUser);
  return router;
}

export default userRouter();
