import { z } from "zod";
const paramsTag = z
  .object({
    id: z.string(),
  })
  .strict();
const bodyTag = z
  .object({
    name: z
      .string({
        required_error: "name field is required",
        invalid_type_error: "name field must be string",
      })
      .min(1, "name field must be at least 1 character"),
    slug: z
      .string({
        required_error: "slug field is required",
        invalid_type_error: "slug field must be string",
      })
      .min(1, "slug field must be at least 1 character")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid slug"),
  })
  .strict();
export const getTagSchema = z.object({
  params: paramsTag,
});
export const createTagSchema = z.object({
  body: bodyTag,
});
export const editTagSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: bodyTag.partial(),
});
export const deleteTagSchema = getTagSchema;
export type GetTag = z.infer<typeof getTagSchema>;
export type CreateTag = z.infer<typeof createTagSchema>;
export type EditTag = z.infer<typeof editTagSchema>;
export type DeleteTag = CreateTag;
