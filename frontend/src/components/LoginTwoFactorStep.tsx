import React, { useState } from "react";
import { OtpInput } from "./OtpInput.tsx";
import { ApiError, verifyLoginCode } from "../services/api.ts";
import type { AuthResponse } from "../models/user.ts";
import { OTP_LENGTH, validateOtp } from "../utils/validation.ts";

interface LoginTwoFactorStepProps {
  email: string;
  onVerified: (session: AuthResponse) => void;
  onBack: () => void;
}

// Second step of a two-factor login: the user types the code that was emailed to them.
export const LoginTwoFactorStep: React.FC<LoginTwoFactorStepProps> = ({ email, onVerified, onBack }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problem = validateOtp(code);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const session = await verifyLoginCode({ email, code });
      onVerified(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("We could not confirm your code. Please try again.");
      }
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className='form-heading'>
        <h2>Check your email</h2>
        <p>
          We sent a {OTP_LENGTH} digit login code to <strong>{email}</strong>. It expires in 10 minutes.
        </p>
      </div>

      {error && (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className='form-stack'>
        <div className='field-wrap'>
          <OtpInput value={code} onChange={setCode} invalid={!!error} disabled={loading} autoFocus />
        </div>

        <button className='btn btn-block' type='submit' disabled={loading}>
          {loading ? "Confirming..." : "Confirm and log in"}
        </button>

        <div className='form-links'>
          <button type='button' className='text-link' onClick={onBack} disabled={loading}>
            Back to log in
          </button>
        </div>
      </form>
    </>
  );
};
