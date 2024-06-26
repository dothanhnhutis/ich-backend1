import z from "zod";

const signinBoduSchema = z.object({
  email: z
    .string({
      required_error: "email field is required",
      invalid_type_error: "email field must be string",
    })
    .email("invalid email or password"),
  password: z
    .string({
      required_error: "password field is required",
      invalid_type_error: "password field must be string",
    })
    .min(8, "invalid email or password")
    .max(40, "invalid email or password"),
});

export const signinSchema = z.object({
  body: signinBoduSchema.strict(),
});

export const checkEmailCheckSchema = z.object({
  body: signinBoduSchema.pick({ email: true }).strict(),
});

export const signupSchema = z.object({
  body: z
    .object({
      username: z
        .string({
          required_error: "Username field is required",
          invalid_type_error: "Username field must be string",
        })
        .min(1, "Username can't be empty"),
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
    })
    .strict(),
});

export const verifyEmailSchema = z.object({
  params: z.object({
    token: z.string(),
  }),
});

export const sendRecoverEmailSchema = z.object({
  body: signupSchema.shape.body
    .pick({
      email: true,
    })
    .strict(),
});
export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string(),
  }),
  body: z
    .object({
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
      confirmPassword: z.string(),
    })
    .strict()
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }),
});

export const reactivateAccountSchema = z.object({
  params: z.object({
    token: z.string(),
  }),
});

export type SignIn = z.infer<typeof signinSchema>;
export type SignUp = z.infer<typeof signupSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;
export type SendRecoverEmail = z.infer<typeof sendRecoverEmailSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type CheckEmailDisactive = z.infer<typeof checkEmailCheckSchema>;
export type ReactivateAccount = z.infer<typeof reactivateAccountSchema>;
export type UserRole = "ADMIN" | "MANAGER" | "SALER" | "WRITER" | "CUSTOMER";
