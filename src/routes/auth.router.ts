import { signIn } from "@/controllers/auth.controller";
import validateResource from "@/middleware/validateResource";
import { signinSchema } from "@/schemas/auth.schema";
import express, { type Router } from "express";

const router: Router = express.Router();
function authRouter(): Router {
  router.post("/auth", validateResource(signinSchema), signIn);
  return router;
}

export default authRouter();
