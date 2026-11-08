import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailIcon } from "../components/Icons.tsx";
import { OtpInput } from "../components/OtpInput.tsx";
import { PasswordField } from "../components/PasswordField.tsx";
import { useCountdown } from "../hooks/useCountdown.ts";
import { ApiError, requestPasswordReset, resetPassword } from "../services/api.ts";
import { sanitizeEmail } from "../utils/sanitize.ts";
import { passwordRules, validateEmail, validateOtp, validatePassword } from "../utils/validation.ts";

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];

type Step = "email" | "reset" | "done";

type Errors = {
  email?: string;
  code?: string;
  password?: string;
  confirm?: string;
  form?: string;
  list?: string[];
};

// Forgot password: ask for the email, then accept the emailed code together with a new password.
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cooldown = useCountdown();

  const score = passwordRules.filter((rule) => rule.test(password)).length;

  // Shows the server's message and starts the wait it asks for when the request was throttled.
  const showApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      setErrors({ form: err.message, list: err.errors });
      if (err.retryAfterSeconds > 0) cooldown.start(err.retryAfterSeconds);
      return;
    }
    setErrors({ form: fallback });
  };

  const sendCode = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    setNotice(null);

    const cleanEmail = sanitizeEmail(email);
    const emailError = validateEmail(cleanEmail);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const result = await requestPasswordReset(cleanEmail);
      setEmail(cleanEmail);
      setCode("");
      cooldown.start(result.resendAfterSeconds);
      setNotice(result.message);
      setStep("reset");
    } catch (err) {
      showApiError(err, "We could not send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    const next: Errors = {};
    const codeError = validateOtp(code);
    const passwordError = validatePassword(password);
    if (codeError) next.code = codeError;
    if (passwordError) next.password = passwordError;
    if (!confirm) {
      next.confirm = "Re-enter your new password.";
    } else if (confirm !== password) {
      next.confirm = "Passwords don't match.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await resetPassword({ email, code, newPassword: password });
      setStep("done");
    } catch (err) {
      showApiError(err, "We could not reset your password. Please try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <>
        <div className='form-heading'>
          <h2>Password updated</h2>
          <p>Your password has been changed. Log in with your new password to continue.</p>
        </div>
        <div className='alert alert-success' role='status'>
          For your safety, you have been signed out on every other device.
        </div>
        <button className='btn btn-block' type='button' onClick={() => navigate("/login", { replace: true })}>
          Go to log in
        </button>
      </>
    );
  }

  if (step === "reset") {
    let resendLabel = "Resend code";
    if (cooldown.seconds > 0) {
      resendLabel = `Resend code in ${cooldown.seconds}s`;
    }

    return (
      <>
        <div className='form-heading'>
          <h2>Enter your code</h2>
          <p>
            Type the 6 digit code we emailed to <strong>{email}</strong>, then choose a new password.
          </p>
        </div>

        {notice && (
          <div className='alert alert-info' role='status'>
            {notice}
          </div>
        )}
        {errors.form && (
          <div className='alert alert-danger' role='alert'>
            <span>
              {errors.form}
              {errors.list && errors.list.length > 0 && (
                <ul>
                  {errors.list.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </span>
          </div>
        )}

        <form onSubmit={submitReset} noValidate className='form-stack'>
          <div className='field-wrap'>
            <span className='label'>Reset code</span>
            <OtpInput
              value={code}
              onChange={setCode}
              invalid={!!errors.code}
              disabled={loading}
              autoFocus
              label='Reset code'
            />
            {errors.code && <span className='err-text'>{errors.code}</span>}
          </div>

          <div className='field-wrap'>
            <div className='label-row'>
              <label className='label' htmlFor='reset-password'>
                New password
              </label>
              {password && <span className={`strength-label level-${score}`}>{STRENGTH[score]}</span>}
            </div>
            <PasswordField
              id='reset-password'
              value={password}
              onChange={setPassword}
              autoComplete='new-password'
              placeholder='Enter your new password'
              invalid={!!errors.password}
            />
            {errors.password && <span className='err-text'>{errors.password}</span>}
          </div>

          <div className='field-wrap'>
            <label className='label' htmlFor='reset-confirm'>
              Confirm new password
            </label>
            <PasswordField
              id='reset-confirm'
              value={confirm}
              onChange={setConfirm}
              autoComplete='new-password'
              placeholder='Re-enter your new password'
              invalid={!!errors.confirm}
              valid={!!confirm && confirm === password}
            />
            {errors.confirm && <span className='err-text'>{errors.confirm}</span>}
          </div>

          <button className='btn btn-block' type='submit' disabled={loading}>
            {loading && "Updating password..."}
            {!loading && "Update password"}
          </button>

          <div className='form-links'>
            <button
              type='button'
              className='text-link'
              onClick={() => sendCode()}
              disabled={cooldown.seconds > 0 || loading}
            >
              {resendLabel}
            </button>
            <button
              type='button'
              className='text-link'
              onClick={() => {
                setErrors({});
                setNotice(null);
                setStep("email");
              }}
              disabled={loading}
            >
              Use a different email
            </button>
          </div>
        </form>
      </>
    );
  }

  const emailClasses = ["field"];
  if (errors.email) emailClasses.push("bad");

  return (
    <>
      <div className='form-heading'>
        <h2>Forgot your password?</h2>
        <p>Enter your email and we will send you a code to reset it.</p>
      </div>

      {errors.form && (
        <div className='alert alert-danger' role='alert'>
          {errors.form}
        </div>
      )}

      <form onSubmit={sendCode} noValidate className='form-stack'>
        <div className='field-wrap'>
          <label className='label' htmlFor='forgot-email'>
            Email
          </label>
          <div className='input-wrap'>
            <span className='input-icon'>
              <MailIcon />
            </span>
            <input
              id='forgot-email'
              className={emailClasses.join(" ")}
              type='email'
              autoComplete='email'
              maxLength={254}
              placeholder='Enter your email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && <span className='err-text'>{errors.email}</span>}
        </div>

        <button className='btn btn-block' type='submit' disabled={loading}>
          {loading && "Sending code..."}
          {!loading && "Send reset code"}
        </button>

        <div className='form-links'>
          <button type='button' className='text-link' onClick={() => navigate("/login")}>
            Back to log in
          </button>
        </div>
      </form>
    </>
  );
};
