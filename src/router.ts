import { Application } from "express";
import { healthController } from "@/controllers/health.controller";
import authRouter from "@/routes/auth.router";

const BASE_PATH = "/api/v1";
export function appRouter(app: Application) {
  app.get("", healthController);
  app.use(BASE_PATH, authRouter);
}
