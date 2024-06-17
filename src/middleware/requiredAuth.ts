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

  if (req.session.user?.id && !user) {
    await req.logout();
    throw new NotAuthorizedError();
  }

  if (!user || user.isBlocked || !user.isActive) {
    throw new PermissionError();
  }

  next();
};
