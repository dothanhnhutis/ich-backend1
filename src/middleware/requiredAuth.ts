import { RequestHandler as Middleware } from "express";
import { NotAuthorizedError, PermissionError } from "../error-handler";

// export const requiredAuth: Middleware = (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     throw new NotAuthorizedError();
//   }
//   next();
// };

// export const checkActive: Middleware = (req, res, next) => {
//   if (!req.user || req.user.isBlocked) {
//     throw new PermissionError();
//   }
//   next();
// };
