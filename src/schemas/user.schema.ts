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
      isActive: z.string().or(z.string().array()),
      isBlocked: z.string().or(z.string().array()),
      orderBy: z.string().or(z.string().array()),
      page: z.string().or(z.string().array()),
      limit: z.string().or(z.string().array()),
    })
    .strip()
    .partial()
    .refine((data) => {
      if (data.role) {
        if (
          typeof data.role == "string" &&
          !roles.includes(data.role as Role)
        ) {
          delete data.role;
        }
        if (Array.isArray(data.role)) {
          const newRoles = data.role
            .filter((val) => roles.includes(val as Role))
            .filter((value, index, array) => array.indexOf(value) === index);
          if (newRoles.length == 0) {
            delete data.role;
          } else if (newRoles.length == 1) {
            data.role = newRoles[0];
          } else {
            data.role = newRoles;
          }
        }
      }

      if (data.emailVerified) {
        if (typeof data.emailVerified == "string") {
          if (trueFalseRegex.test(data.emailVerified)) {
            data.emailVerified =
              data.emailVerified == "0" || "false" ? "false" : "true";
          } else {
            delete data.emailVerified;
          }
        }
        if (Array.isArray(data.emailVerified)) {
          const newEmailVerifieds = data.emailVerified
            .filter((val) => trueFalseRegex.test(val))
            .map((val) => (val == "0" || val == "false" ? "false" : "true"))
            .filter((value, index, array) => array.indexOf(value) === index);
          if (newEmailVerifieds.length == 0) {
            delete data.emailVerified;
          } else if (newEmailVerifieds.length == 1) {
            data.emailVerified = newEmailVerifieds[0];
          } else {
            data.emailVerified = newEmailVerifieds;
          }
        }
      }

      if (data.isActive) {
        if (typeof data.isActive == "string") {
          if (trueFalseRegex.test(data.isActive)) {
            data.isActive = data.isActive == "0" || "false" ? "false" : "true";
          } else {
            delete data.isActive;
          }
        }
        if (Array.isArray(data.isActive)) {
          const newIsActives = data.isActive
            .filter((val) => trueFalseRegex.test(val))
            .map((val) => (val == "0" || val == "false" ? "false" : "true"))
            .filter((value, index, array) => array.indexOf(value) === index);
          if (newIsActives.length == 0) {
            delete data.isActive;
          } else if (newIsActives.length == 1) {
            data.isActive = newIsActives[0];
          } else {
            data.isActive = newIsActives;
          }
        }
      }

      if (data.isBlocked) {
        if (typeof data.isBlocked == "string") {
          if (trueFalseRegex.test(data.isBlocked)) {
            data.isBlocked =
              data.isBlocked == "0" || "false" ? "false" : "true";
          } else {
            delete data.isBlocked;
          }
        }
        if (Array.isArray(data.isBlocked)) {
          const newIsBlockeds = data.isBlocked
            .filter((val) => trueFalseRegex.test(val))
            .map((val) => (val == "0" || val == "false" ? "false" : "true"))
            .filter((value, index, array) => array.indexOf(value) === index);
          if (newIsBlockeds.length == 0) {
            delete data.isBlocked;
          } else if (newIsBlockeds.length == 1) {
            data.isBlocked = newIsBlockeds[0];
          } else {
            data.isBlocked = newIsBlockeds;
          }
        }
      }
      console.log(data.orderBy);

      if (data.orderBy) {
        if (typeof data.orderBy == "string") {
          if (orderBysRegex.test(data.orderBy)) {
            const newOrderBys = data.orderBy
              .split(",")
              .filter((val) => orderByRegex.test(val))
              .filter((value, index, array) => array.indexOf(value) === index);
            data.orderBy = newOrderBys;
          } else {
            delete data.orderBy;
          }
        }
        if (Array.isArray(data.orderBy)) {
          const newOrderBys = data.orderBy
            .filter((val) => orderByRegex.test(val))
            .filter((value, index, array) => array.indexOf(value) === index);
          data.orderBy = newOrderBys;
        }
      }

      if (data.page && Array.isArray(data.page)) {
        data.page = data.page.reverse()[0];
      }
      if (data.limit && Array.isArray(data.limit)) {
        data.limit = data.limit.reverse()[0];
      }
      return data;
    }),
});

export type EditPassword = z.infer<typeof editPasswordSchema>;
export type EditProfile = z.infer<typeof editProfileSchema>;
export type EditPicture = z.infer<typeof editPictureSchema>;
export type CreateUser = z.infer<typeof creatUserSchema>;
export type EditUser = z.infer<typeof editUserSchema>;
export type Role = CreateUser["body"]["role"];

export type SearchUser = z.infer<typeof searchUserSchema>["query"];

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
