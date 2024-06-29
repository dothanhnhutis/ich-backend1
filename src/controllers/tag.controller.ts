import { BadRequestError, NotFoundError } from "@/error-handler";
import { CreateTag, EditTag, GetTag } from "@/schemas/tag.schema";
import {
  createTag,
  deleteTagById,
  editTagById,
  getAllTag,
  getTagById,
  getTagByIdOrSlug,
} from "@/services/tag.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export async function getTags(req: Request, res: Response) {
  const tags = await getAllTag();
  return res.status(StatusCodes.OK).send(tags);
}

export async function getTag(req: Request<GetTag["params"]>, res: Response) {
  const tag = await getTagByIdOrSlug(req.params.idOrSlug);
  if (!tag) throw new NotFoundError();
  return res.status(StatusCodes.OK).json(tag);
}

export async function createNewTag(
  req: Request<{}, {}, CreateTag["body"]>,
  res: Response
) {
  const { slug } = req.body;
  const tag = await getTagByIdOrSlug(slug);
  if (tag) throw new BadRequestError("slug already exists");
  const newTag = await createTag(req.body);
  return res
    .status(StatusCodes.CREATED)
    .json({ message: "Tag created successfully", tag: newTag });
}

export async function editTag(
  req: Request<EditTag["params"], {}, EditTag["body"]>,
  res: Response
) {
  const { id } = req.params;
  const { slug } = req.body;
  const tagExist = await getTagById(id);
  if (!tagExist) throw new NotFoundError();
  if (slug && slug !== tagExist.slug) {
    const slugExist = await getTagByIdOrSlug(slug);
    if (slugExist) throw new BadRequestError("Slug has been used");
  }
  const newTag = await editTagById(id, req.body);
  return res
    .status(StatusCodes.OK)
    .json({ message: "Tag updated successfully", tag: newTag });
}

export async function deleteTag(
  req: Request<EditTag["params"]>,
  res: Response
) {
  const { id } = req.params;
  const tag = await getTagById(id);
  if (!tag) throw new NotFoundError();
  if (tag._count.post > 0) throw new BadRequestError("Tag being used by posts");
  const deleteTag = await deleteTagById(id);
  return res
    .status(StatusCodes.OK)
    .json({ message: "Tag removed successfully", tag: deleteTag });
}
