import { CreateTag, EditTag } from "@/schemas/tag.schema";
import prisma from "@/utils/db";
import { Prisma } from "@prisma/client";

export async function getTagByIdOrSlug(idOrSlug: string) {
  return await prisma.tag.findFirst({
    where: {
      OR: [
        {
          id: idOrSlug,
        },
        { slug: idOrSlug },
      ],
    },
  });
}

export async function getAllTag() {
  return await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          post: true,
        },
      },
    },
  });
}

export async function getTagById(id: string) {
  return await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          post: true,
        },
      },
    },
  });
}

export async function createTag(data: Omit<Prisma.TagCreateInput, "post">) {
  return await prisma.tag.create({ data });
}

export async function editTagById(id: string, data: Prisma.TagUpdateInput) {
  return await prisma.tag.update({
    where: { id },
    data,
  });
}

export async function deleteTagById(id: string) {
  return await prisma.tag.delete({
    where: { id },
  });
}
