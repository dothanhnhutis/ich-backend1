import { Request, RequestHandler as Middleware } from "express";
import { NotAuthorizedError, PermissionError } from "../error-handler";
import prisma from "@/utils/db";
import { getUserById } from "@/services/user.service";

type AuthMiddlewareCheckType = "emailVerified" | "isBlocked" | "isActive";

export const authMiddleware =
  (typesCheck?: AuthMiddlewareCheckType[]): Middleware =>
  async (req, _, next) => {
    if (!req.session.user) {
      throw new NotAuthorizedError();
    }

    if (typesCheck) {
      const user = await getUserById(req.session.user.id);
      if (!user) {
        await req.logout();
        throw new NotAuthorizedError();
      }
      if (typesCheck.includes("emailVerified") && !user.emailVerified) {
        throw new PermissionError("Your email hasn't been verified");
      }
      if (typesCheck.includes("isActive") && !user.isActive) {
        throw new PermissionError();
      }
      if (typesCheck.includes("isBlocked") && user.isBlocked) {
        throw new PermissionError(
          "Your account has been locked please contact the administrator"
        );
      }
      req.user = user;
    }
    next();
  };

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
