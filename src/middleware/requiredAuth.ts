import { RequestHandler as Middleware } from "express";
import { NotAuthorizedError, PermissionError } from "../error-handler";
import prisma from "@/utils/db";

export const requiredAuth: Middleware = (req, res, next) => {
  if (!req.session.user) {
    throw new NotAuthorizedError();
  }
  next();
};

export const checkActive: Middleware = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.session.user?.id,
    },
  });
  if (!user || user.isBlocked) {
    throw new PermissionError();
  }
  next();
};
