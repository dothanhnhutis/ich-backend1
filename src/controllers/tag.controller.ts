import { BadRequestError, NotFoundError } from "@/error-handler";
import { CreateTag, EditTag, GetTag } from "@/schemas/tag.schema";
import {
  createTag,
  deleteTagById,
  editTagById,
  getAllTag,
  getTagById,
  getTagBySlug,
} from "@/services/tag.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export async function getTags(req: Request, res: Response) {
  const tags = await getAllTag();
  return res.status(StatusCodes.OK).send(tags);
}

export async function getTag(req: Request<GetTag["params"]>, res: Response) {
  const tag = await getTagById(req.params.id);
  return res.status(StatusCodes.OK).send(tag);
}

export async function createNewTag(
  req: Request<{}, {}, CreateTag["body"]>,
  res: Response
) {
  const { slug } = req.body;
  const tag = await getTagBySlug(slug);
  if (tag) throw new BadRequestError("slug has been used");
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
    const slugExist = await getTagBySlug(slug);
    if (slugExist) throw new BadRequestError("slug has been used");
  }

  const newTag = await editTagById(id, req.body);

  return res.json({ message: "Tag updated successfully", tag: newTag });
}

export async function deleteTag(
  req: Request<EditTag["params"]>,
  res: Response
) {
  const { id } = req.params;
  const tag = await getTagById(id);
  if (!tag) throw new NotFoundError();
  if (tag._count.post > 0) throw new BadRequestError("tag is in use");
  const deleteTag = await deleteTagById(id);
  return res
    .status(200)
    .json({ message: "Tag removed successfully", tag: deleteTag });
}
