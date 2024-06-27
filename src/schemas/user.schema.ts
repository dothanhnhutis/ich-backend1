import { z } from "zod";

export const editPasswordSchema = z.object({
  body: z
    .object({
      oldPassword: z.string(),
      newPassword: z
        .string({
          required_error: "Password field is required",
          invalid_type_error: "Password field must be string",
        })
        .min(8, "Password field is too short")
        .max(40, "Password field can not be longer than 40 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/,
          "Password field must include: letters, numbers and special characters"
        ),
      confirmNewPassword: z.string(),
    })
    .strict()
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "Confirm new password don't match",
      path: ["confirmNewPassword"],
    })
    .refine((data) => data.oldPassword === data.newPassword, {
      message: "The new password and old password must not be the same",
      path: ["confirmNewPassword"],
    }),
});

export const creatUserSchema = z.object({
  body: z
    .object({
      username: z
        .string({
          required_error: "username field is required",
          invalid_type_error: "username field must be string",
        })
        .min(1, "username can't be empty"),
      email: z
        .string({
          required_error: "Email field is required",
          invalid_type_error: "Email field must be string",
        })
        .email("Invalid email"),
      password: z
        .string({
          required_error: "Password field is required",
          invalid_type_error: "Password field must be string",
        })
        .min(8, "Password field is too short")
        .max(40, "Password field can not be longer than 40 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/,
          "Password field must include: letters, numbers and special characters"
        ),
      role: z.enum(["ADMIN", "MANAGER", "SALER", "WRITER", "CUSTOMER"]),
      isActive: z
        .boolean({
          required_error: "isActive field is required",
          invalid_type_error: "isActive field must be boolean",
        })
        .default(true),
      isBlocked: z
        .boolean({
          required_error: "isBlocked field is required",
          invalid_type_error: "isBlocked field must be boolean",
        })
        .default(false),
      phone: z
        .string({
          required_error: "phone field is required",
          invalid_type_error: "phone field must be string",
        })
        .optional(),
      address: z
        .string({
          required_error: "address field is required",
          invalid_type_error: "address field must be string",
        })
        .optional(),
    })
    .strict(),
});

export const editProfileSchema = z.object({
  body: creatUserSchema.shape.body
    .pick({
      username: true,
      phone: true,
      address: true,
    })
    .partial()
    .strip(),
});

export const editPictureSchema = z.object({
  body: z
    .object({
      pictureType: z.enum(["base64", "url"]),
      pictureData: z.string(),
    })
    .strict(),
});

export const editUserSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: creatUserSchema.shape.body
    .extend({
      picture: editPictureSchema.shape.body,
      isActive: z.boolean({
        required_error: "isActive field is required",
        invalid_type_error: "isActive field must be boolean",
      }),
    })
    .partial()
    .strip(),
});

export type EditPassword = z.infer<typeof editPasswordSchema>;
export type EditProfile = z.infer<typeof editProfileSchema>;
export type EditPicture = z.infer<typeof editPictureSchema>;
export type CreateUser = z.infer<typeof creatUserSchema>;
export type EditUser = z.infer<typeof editUserSchema>;
