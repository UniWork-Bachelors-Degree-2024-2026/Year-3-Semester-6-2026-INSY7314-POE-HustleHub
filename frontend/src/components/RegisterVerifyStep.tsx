import React, { useState } from "react";
import { OtpInput } from "./OtpInput.tsx";
import { useCountdown } from "../hooks/useCountdown.ts";
import { ApiError, resendRegistrationCode, verifyRegistration } from "../services/api.ts";
import type { AuthResponse } from "../models/user.ts";
import { OTP_LENGTH, validateOtp } from "../utils/validation.ts";

interface RegisterVerifyStepProps {
  email: string;
  initialCooldown: number;
  onVerified: (session: AuthResponse) => void;
  onBack: () => void;
}

// Second step of registration: the user types the code that was emailed to them.
export const RegisterVerifyStep: React.FC<RegisterVerifyStepProps> = ({
  email,
  initialCooldown,
  onVerified,
  onBack,
}) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cooldown = useCountdown(initialCooldown);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    const problem = validateOtp(code);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const session = await verifyRegistration({ email, code });
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

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    try {
      const result = await resendRegistrationCode(email);
      cooldown.start(result.resendAfterSeconds);
      setCode("");
      setNotice("A new code is on its way. The old one no longer works.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.retryAfterSeconds > 0) cooldown.start(err.retryAfterSeconds);
      } else {
        setError("We could not send a new code. Please try again.");
      }
    }
  };

  let resendLabel = "Resend code";
  if (cooldown.seconds > 0) {
    resendLabel = `Resend code in ${cooldown.seconds}s`;
  }

  return (
    <>
      <div className='form-heading'>
        <h2>Check your email</h2>
        <p>
          We sent a {OTP_LENGTH} digit code to <strong>{email}</strong>. It expires in 10 minutes.
        </p>
      </div>

      {error && (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      )}
      {notice && (
        <div className='alert alert-success' role='status'>
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className='form-stack'>
        <div className='field-wrap'>
          <OtpInput value={code} onChange={setCode} invalid={!!error} disabled={loading} autoFocus />
        </div>

        <button className='btn btn-block' type='submit' disabled={loading}>
          {loading && "Confirming..."}
          {!loading && "Confirm and create account"}
        </button>

        <div className='form-links'>
          <button type='button' className='text-link' onClick={handleResend} disabled={cooldown.seconds > 0 || loading}>
            {resendLabel}
          </button>
          <button type='button' className='text-link' onClick={onBack} disabled={loading}>
            Use a different email
          </button>
        </div>
      </form>
    </>
  );
};
