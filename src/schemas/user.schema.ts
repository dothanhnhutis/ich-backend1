import { z } from "zod";

const roles = ["ADMIN", "MANAGER", "SALER", "WRITER", "CUSTOMER"] as const;
const trueFalseRegex = /^(0|1|true|false)$/;
const orderBysRegex =
  /^((email|role|emailVerified|isActive|isBlocked)\.(asc|desc)(\,)?)+((email|role|emailVerified|isActive|isBlocked)\.(asc|desc)?)$/;
const orderByRegex =
  /^((email|role|emailVerified|isActive|isBlocked)\.(asc|desc))$/;

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
      role: z.enum(roles),
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

export const searchUserSchema = z.object({
  query: z
    .object({
      email: z.string().or(z.string().array()),
      role: z.string().or(z.string().array()),
      emailVerified: z.string().or(z.string().array()),
      // isActive: z.string().or(z.string().array()),
      // isBlocked: z.string().or(z.string().array()),
      // orderBy: z.string().or(z.string().array()),
      // page: z.string().or(z.string().array()),
      // limit: z.string().or(z.string().array()),
    })
    .strip()
    .partial(),
  body: z
    .object({
      email: z
        .string({
          invalid_type_error: "Email field must be string",
        })
        .email("Email field is invalid"),
      emails: z
        .array(z.string().email("Some elements in the array are not email"), {
          invalid_type_error: "Emails field must be array",
        })
        .nonempty("Email field can not empty"),
      role: z.enum(roles, {
        invalid_type_error:
          "Role field must be 'ADMIN' | 'MANAGER' | 'SALER' | 'WRITER' | 'CUSTOMER'",
      }),
      roles: z
        .array(
          z.enum(roles, {
            message:
              "All element in array must be 'ADMIN' | 'MANAGER' | 'SALER' | 'WRITER' | 'CUSTOMER'",
          }),
          {
            invalid_type_error:
              "Roles field must be array 'ADMIN' | 'MANAGER' | 'SALER' | 'WRITER' | 'CUSTOMER'",
          }
        )
        .nonempty("Roles field can not empty"),
      emailVerified: z.boolean({
        invalid_type_error: "Email field must be boolean",
      }),
      emailVerifieds: z
        .array(
          z.boolean({
            message: "All element in array must be true | false",
          }),
          {
            invalid_type_error: "EmailVerifieds field must be array",
          }
        )
        .nonempty("EmailVerifieds field can not empty"),
      // isActive: z.string(),
      // isActives: z.string().array(),
      // isBlocked: z.string(),
      // isBlockeds: z.string().array(),
      // orderBy: z.string().or(z.string().array()),
      // page: z.string().or(z.string().array()),
      // limit: z.string().or(z.string().array()),
    })
    .strip()
    .partial(),
});

export type EditPassword = z.infer<typeof editPasswordSchema>;
export type EditProfile = z.infer<typeof editProfileSchema>;
export type EditPicture = z.infer<typeof editPictureSchema>;
export type CreateUser = z.infer<typeof creatUserSchema>;
export type EditUser = z.infer<typeof editUserSchema>;
export type Role = CreateUser["body"]["role"];

export type SearchUser = z.infer<typeof searchUserSchema>;

export type CurrentUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  isActive: boolean;
  username: string;
  isBlocked: boolean;
  phone: string;
  picture: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
};
