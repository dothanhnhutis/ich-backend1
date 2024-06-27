import { Application } from "express";
import { healthController } from "@/controllers/health.controller";
import authRouter from "@/routes/auth.router";
import userRouter from "@/routes/user.router";
import tagRouter from "@/routes/tag.router";

const BASE_PATH = "/api/v1";
export function appRouter(app: Application) {
  app.get("", healthController);
  app.use(BASE_PATH, authRouter);
  app.use(BASE_PATH, userRouter);
  app.use(BASE_PATH, tagRouter);
}
