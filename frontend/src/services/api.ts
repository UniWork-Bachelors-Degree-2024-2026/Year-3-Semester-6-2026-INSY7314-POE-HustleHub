import type {
  AuthResponse,
  LoginPayload,
  OtpStarted,
  RegisterPayload,
  ResetPasswordPayload,
  TwoFactorChallenge,
  User,
  VerifyLoginPayload,
  VerifyRegistrationPayload,
} from "../models/user.ts";
import { API_URL } from "../config.ts";

// Carries the backend's message plus any validation errors so pages can show them
export class ApiError extends Error {
  errors: string[];
  status: number;
  // Seconds to wait before retrying, sent by the server with a 429 response
  retryAfterSeconds: number;

  constructor(message: string, errors: string[] = [], status = 0, retryAfterSeconds = 0) {
    super(message);
    this.errors = errors;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError("Could not reach the server. Please try again shortly.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.message || "Something went wrong.",
      data.errors,
      response.status,
      Number(data.retryAfterSeconds) || 0,
    );
  }
  return data as T;
}

// Step one of registration: the server emails a code, no account exists yet
export function startRegistration(payload: RegisterPayload): Promise<OtpStarted> {
  return request<OtpStarted>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Step two of registration: the correct code creates the account and returns the token
export function verifyRegistration(payload: VerifyRegistrationPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendRegistrationCode(email: string): Promise<OtpStarted> {
  return request<OtpStarted>("/auth/register/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// The server answers the same way whether or not the account exists
export function requestPasswordReset(email: string): Promise<OtpStarted> {
  return request<OtpStarted>("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// With two-factor switched on, a correct password returns a challenge instead of a token
export function loginUser(payload: LoginPayload): Promise<AuthResponse | TwoFactorChallenge> {
  return request<AuthResponse | TwoFactorChallenge>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function isTwoFactorChallenge(result: AuthResponse | TwoFactorChallenge): result is TwoFactorChallenge {
  return "twoFactorRequired" in result && result.twoFactorRequired === true;
}

// Second step of a two-factor login: the emailed code returns the token
export function verifyLoginCode(payload: VerifyLoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login/2fa", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Protected route: switches two-factor login on or off, the current password is required
export function setTwoFactor(
  token: string,
  payload: { enabled: boolean; password: string },
): Promise<{ message: string; twoFactorEnabled: boolean }> {
  return request<{ message: string; twoFactorEnabled: boolean }>("/auth/2fa", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

// Protected route: the JWT is sent as a Bearer token
export function getProfile(token: string): Promise<User> {
  return request<User>("/auth/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface UpdateProfilePayload {
  username: string;
  email: string;
}

// Protected route: saves the account details (expects PUT /api/auth/profile on the backend)
export function updateProfile(token: string, payload: UpdateProfilePayload): Promise<User> {
  return request<User>("/auth/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Protected route: changes the password (expects PUT /api/auth/password on the backend)
// The server returns a fresh token, because changing the password signs out every older session
export function changePassword(
  token: string,
  payload: ChangePasswordPayload,
): Promise<{ message: string; token?: string }> {
  return request<{ message: string; token?: string }>("/auth/password", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function checkHealth(): Promise<{ message: string }> {
  return request<{ message: string }>("/health");
}
