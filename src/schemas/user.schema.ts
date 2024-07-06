import { z } from "zod";

const roles = ["MANAGER", "SALER", "WRITER", "CUSTOMER"] as const;
const emailRegex =
  /^((([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))(\,))*?(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const roleRegex =
  /^((ADMIN|MANAGER|SALER|WRITER|CUSTOMER)(\,))*?(ADMIN|MANAGER|SALER|WRITER|CUSTOMER)$/;
const trueFalseRegex = /^(0|1|true|false)$/;
const orderByRegex =
  /^((email|role|emailVerified|isActive|isBlocked)\.(asc|desc)\,)*?(email|role|emailVerified|isActive|isBlocked)\.(asc|desc)$/;
const checkNumber = (number: string) =>
  z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().gte(1))
    .safeParse(number).success;

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
      email: z.string().or(
        z.array(z.string()).transform((email) => {
          return email
            .filter((val) => emailRegex.test(val))
            .join(",")
            .split(",")
            .filter((val, index, array) => array.indexOf(val) === index)
            .join(",");
        })
      ),
      role: z.string().or(
        z.array(z.string()).transform((role) => {
          return role
            .filter((val) => roleRegex.test(val))
            .join(",")
            .split(",")
            .filter((val, index, array) => array.indexOf(val) === index)
            .join(",");
        })
      ),
      emailVerified: z.string().or(
        z.array(z.string()).transform((emailVerified) => {
          return emailVerified
            .filter((val) => trueFalseRegex.test(val))
            .reverse()[0];
        })
      ),
      isActive: z.string().or(
        z.array(z.string()).transform((isActive) => {
          return isActive
            .filter((val) => trueFalseRegex.test(val))
            .reverse()[0];
        })
      ),
      isBlocked: z.string().or(
        z.array(z.string()).transform((isBlocked) => {
          return isBlocked
            .filter((val) => trueFalseRegex.test(val))
            .reverse()[0];
        })
      ),
      orderBy: z.string().or(
        z.array(z.string()).transform((orderBy) => {
          return orderBy
            .filter((val) => orderByRegex.test(val))
            .join(",")
            .split(",")
            .filter((val, index, array) => array.indexOf(val) === index)
            .join(",");
        })
      ),
      page: z.string().or(
        z.array(z.string()).transform((page) => {
          return page.filter((val) => /[1-9][0-9]*/.test(val)).reverse()[0];
        })
      ),
      limit: z.string().or(
        z.array(z.string()).transform((limit) => {
          return limit.filter((val) => /[1-9][0-9]*/.test(val)).reverse()[0];
        })
      ),
    })
    .strip()
    .partial()
    .transform((val) => {
      if (!emailRegex.test(val.email || "")) {
        delete val.email;
      }
      if (!roleRegex.test(val.role || "")) {
        delete val.role;
      }
      if (!trueFalseRegex.test(val.emailVerified || "")) {
        delete val.emailVerified;
      }
      if (!trueFalseRegex.test(val.isActive || "")) {
        delete val.isActive;
      }
      if (!trueFalseRegex.test(val.isBlocked || "")) {
        delete val.isBlocked;
      }
      if (!trueFalseRegex.test(val.orderBy || "")) {
        delete val.orderBy;
      }
      if (!checkNumber(val.page || "")) {
        delete val.page;
      }
      if (!checkNumber(val.limit || "")) {
        delete val.limit;
      }
      return val;
    }),
  body: z
    .object({
      email: z
        .string({
          invalid_type_error: "Email field must be string",
        })
        .regex(
          emailRegex,
          "Email field invalid. Ex: 'example@gmail.com' | 'example@gmail.com,example1@gmail.com'"
        ),
      role: z
        .string({
          invalid_type_error:
            "Role field must be 'ADMIN' | 'MANAGER' | 'SALER' | 'WRITER' | 'CUSTOMER'. Ex: 'MANAGER' | 'MANAGER,SALER'",
        })
        .regex(
          roleRegex,
          "Role field must be 'ADMIN' | 'MANAGER' | 'SALER' | 'WRITER' | 'CUSTOMER'. Ex: 'MANAGER' | 'MANAGER,SALER'"
        ),
      emailVerified: z
        .string({
          invalid_type_error:
            "EmailVerified field must be '0' | '1' | 'true' | 'false'. Ex: 'true' | '0'",
        })
        .regex(
          trueFalseRegex,
          "EmailVerified field must be '0' | '1' | 'true' | 'false'. Ex: 'true' | '0'"
        )
        .transform(
          (emailVerified) => emailVerified == "true" || emailVerified == "1"
        ),
      isActive: z
        .string({
          invalid_type_error:
            "IsActive field must be '0' | '1' | 'true' | 'false'. Ex: 'true' | '0'",
        })
        .regex(
          trueFalseRegex,
          "IsActive field must be '0' | '1' | 'true' | 'false'. Ex: 'true' | '0'"
        )
        .transform(
          (emailVerified) => emailVerified == "true" || emailVerified == "1"
        ),
      isBlocked: z
        .string({
          invalid_type_error:
            "IsBlocked field must be '0' | '1' | 'true' | 'false'. Ex: 'true' | '0'",
        })
        .regex(
          trueFalseRegex,
          "IsBlocked field must be '0' | '1' | 'true' | 'false'. Ex: 'true' | '0'"
        )
        .transform(
          (emailVerified) => emailVerified == "true" || emailVerified == "1"
        ),
      orderBy: z
        .string({
          invalid_type_error:
            "OrderBy field must be format (email|role|emailVerified|isActive|isBlocked).(asc|desc). Ex: 'email.asc' | 'email.asc,email.desc'",
        })
        .regex(
          orderByRegex,
          "OrderBy field must be format (email|role|emailVerified|isActive|isBlocked).(asc|desc). Ex: 'email.asc' | 'email.asc,email.desc'"
        ),
      page: z
        .number({
          invalid_type_error: "Page field must be number",
        })
        .gte(1, "Page field should be >= 1"),
      limit: z
        .number({
          invalid_type_error: "Limit field must be number",
        })
        .gte(1, "Limit field should be >= 1"),
    })
    .strip()
    .partial(),
});

export type EditPassword = z.infer<typeof editPasswordSchema>;
export type EditProfile = z.infer<typeof editProfileSchema>;
export type EditPicture = z.infer<typeof editPictureSchema>;
export type CreateUser = z.infer<typeof creatUserSchema>;
export type EditUser = z.infer<typeof editUserSchema>;
export type Role = CreateUser["body"]["role"] | "ADMIN";
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
