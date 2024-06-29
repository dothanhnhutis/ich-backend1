import {
  createNewTag,
  deleteTag,
  editTag,
  getTag,
  getTags,
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
import express, { type Router } from "express";
const router: Router = express.Router();
function tagRouter(): Router {
  router.patch(
    "/tags/:id",
    validateResource(editTagSchema),
    requiredAuth,
    checkPermission(["ADMIN", "MANAGER", "WRITER"]),
    editTag
  );
  router.delete(
    "/tags/:id",
    validateResource(deleteTagSchema),
    requiredAuth,
    checkPermission(["ADMIN", "MANAGER", "WRITER"]),
    deleteTag
  );
  router.post(
    "/tags",
    validateResource(createTagSchema),
    requiredAuth,
    checkPermission(["ADMIN", "MANAGER", "WRITER"]),
    createNewTag
  );
  router.get("/tags/:idOrSlug", validateResource(getTagSchema), getTag);
  router.get("/tags", getTags);

  return router;
}

export default tagRouter();
