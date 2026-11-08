import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailIcon } from "../components/Icons.tsx";
import { LoginTwoFactorStep } from "../components/LoginTwoFactorStep.tsx";
import { PasswordField } from "../components/PasswordField.tsx";
import { ApiError, isTwoFactorChallenge, loginUser } from "../services/api.ts";
import { saveSession } from "../services/session.ts";
import { sanitizeEmail } from "../utils/sanitize.ts";
import { validateEmail } from "../utils/validation.ts";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  // Set when the password was right and the account also needs an emailed login code
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: typeof errors = {};
    const cleanEmail = sanitizeEmail(email);
    const emailError = validateEmail(cleanEmail);
    if (emailError) next.email = emailError;
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const data = await loginUser({ email: cleanEmail, password });
      if (isTwoFactorChallenge(data)) {
        setPassword("");
        setTwoFactorEmail(data.email);
        return;
      }
      saveSession(data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // The backend returns a generic message so it never reveals which field was wrong
      setErrors({ form: err instanceof ApiError ? err.message : "Login failed." });
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  if (twoFactorEmail) {
    return (
      <LoginTwoFactorStep
        email={twoFactorEmail}
        onVerified={(session) => {
          saveSession(session);
          navigate("/dashboard", { replace: true });
        }}
        onBack={() => setTwoFactorEmail(null)}
      />
    );
  }

  return (
    <>
      <div className='form-heading'>
        <h2>Welcome back</h2>
        <p>Log in to your HustleHub+ dashboard.</p>
      </div>

      {errors.form && (
        <div className='alert alert-danger' role='alert'>
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className='form-stack'>
        <div className='field-wrap'>
          <label className='label' htmlFor='login-email'>
            Email
          </label>
          <div className='input-wrap'>
            <span className='input-icon'>
              <MailIcon />
            </span>
            <input
              id='login-email'
              className={`field ${errors.email || errors.form ? "bad" : ""}`}
              type='email'
              autoComplete='email'
              maxLength={254}
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && <span className='err-text'>{errors.email}</span>}
        </div>

        <div className='field-wrap'>
          <label className='label' htmlFor='login-password'>
            Password
          </label>
          <PasswordField
            id='login-password'
            value={password}
            onChange={setPassword}
            autoComplete='current-password'
            invalid={!!errors.password || !!errors.form}
          />
          {errors.password && <span className='err-text'>{errors.password}</span>}
          <Link to='/forgot-password' className='text-link forgot-link'>
            Forgot your password?
          </Link>
        </div>

        <button className='btn btn-block' type='submit' disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </>
  );
};
