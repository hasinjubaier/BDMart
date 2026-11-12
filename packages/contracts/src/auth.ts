import { z } from "zod";

/**
 * Normalized Bangladesh Phone Number Schema:
 * Valid format: +8801[3-9]XXXXXXXX
 */
export const BangladeshPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+?880|0)?1[3-9]\d{8}$/,
    "Invalid Bangladesh mobile phone number. Format must be 01XXXXXXXXX or +8801XXXXXXXXX",
  )
  .transform((val) => {
    // Normalize to standard +8801XXXXXXXXX E.164 format
    const digits = val.replace(/\D/g, "");
    if (digits.startsWith("880")) return `+${digits}`;
    if (digits.startsWith("0")) return `+88${digits}`;
    return `+880${digits}`;
  });

/**
 * Request OTP schema for authentication and verification.
 */
export const RequestOtpSchema = z.object({
  phone: BangladeshPhoneSchema,
  purpose: z
    .enum(["LOGIN", "REGISTER", "PASSWORD_RESET", "VERIFICATION", "RECOVERY"])
    .default("LOGIN"),
});

export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

/**
 * Verify OTP schema.
 */
export const VerifyOtpSchema = z.object({
  phone: BangladeshPhoneSchema,
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain digits only"),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

/**
 * User Registration schema (completed during or after phone OTP verification).
 */
export const RegisterUserSchema = z.object({
  phone: BangladeshPhoneSchema,
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain digits only"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name cannot exceed 150 characters"),
  fullNameBn: z
    .string()
    .trim()
    .max(150, "Bangla name cannot exceed 150 characters")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  preferredLanguage: z.enum(["bn", "en"]).default("bn"),
});

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;

/**
 * Update Profile schema.
 */
export const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name cannot exceed 150 characters")
    .optional(),
  fullNameBn: z
    .string()
    .trim()
    .max(150, "Bangla name cannot exceed 150 characters")
    .optional(),
  preferredLanguage: z.enum(["bn", "en"]).optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

/**
 * Password login schema (for business accounts & admin staff).
 */
export const PasswordLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Identifier must be a valid phone or email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type PasswordLoginDto = z.infer<typeof PasswordLoginSchema>;

/**
 * Refresh Token DTO.
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Invalid refresh token"),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

/**
 * Public User Profile Response.
 */
export interface UserProfileResponse {
  id: string;
  phone: string;
  email: string | null;
  status: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  profile: {
    fullName: string;
    fullNameBn: string | null;
    avatarUrl: string | null;
    preferredLanguage: string;
    gender: string | null;
  } | null;
  roles: string[];
}

/**
 * Token response returned after authentication.
 */
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  user: UserProfileResponse;
}

/**
 * Standard API Result wrapper for Auth endpoints.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
