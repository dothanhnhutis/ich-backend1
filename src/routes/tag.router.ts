import {
  createNewTag,
  deleteTag,
  editTag,
  getTag,
} from "@/controllers/tag.controller";
import checkPermission from "@/middleware/checkPermission";
import { requiredAuth } from "@/middleware/requiredAuth";
import validateResource from "@/middleware/validateResource";
import {
  createTagSchema,
  deleteTagSchema,
  editTagSchema,
  getTagSchema,
} from "@/schemas/tag.schema";
import { getAllTag } from "@/services/tag.service";
import express, { type Router } from "express";
const router: Router = express.Router();
function tagRouter(): Router {
  router.patch(
    "/tags/:id",
    validateResource(editTagSchema),
    requiredAuth,
    checkPermission(["ADMIN", "MANAGER"]),
    editTag
  );
  router.delete(
    "/tags/:id",
    validateResource(deleteTagSchema),
    requiredAuth,
    checkPermission(["ADMIN", "MANAGER"]),
    deleteTag
  );
  router.get("/tags/:id", validateResource(getTagSchema), getTag);
  router.post(
    "/tags",
    validateResource(createTagSchema),
    requiredAuth,
    checkPermission(["ADMIN", "MANAGER"]),
    createNewTag
  );
  router.get("/tags", getAllTag);
  return router;
}

export default tagRouter();
