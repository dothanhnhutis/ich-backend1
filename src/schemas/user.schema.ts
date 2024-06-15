import { z } from "zod";

export const changePassword = z.object({
  body: z
    .object({
      currentPassword: z.string(),
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
    .refine((data) => data.currentPassword === data.newPassword, {
      message: "The new password and old password must not be the same",
      path: ["confirmNewPassword"],
    }),
});

export const editProfileSchema = z.object({
  body: z
    .object({
      username: z.string(),
      picture: z.string(),
      phone: z.string(),
      address: z.string(),
    })
    .partial()
    .strip(),
});

export type ChangePassword = z.infer<typeof changePassword>;
export type EditProfile = z.infer<typeof editProfileSchema>;
