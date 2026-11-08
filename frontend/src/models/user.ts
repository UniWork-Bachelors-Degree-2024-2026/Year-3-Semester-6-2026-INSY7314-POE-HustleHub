// Shapes of the data sent to and returned from the /api/auth endpoints

export type UserRole = "client" | "freelancer" | "admin";

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  // Own security feature: true when a code is also needed at login
  twoFactorEnabled?: boolean;
}

export interface AuthResponse extends User {
  token: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: "client" | "freelancer";
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Returned instead of a token when the password was right but a two-factor login code is still needed
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  email: string;
  message: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
}

export interface VerifyLoginPayload {
  email: string;
  code: string;
}

// Returned when the server has emailed a one time code (registration and password reset)
export interface OtpStarted {
  message: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
}

export interface VerifyRegistrationPayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}
