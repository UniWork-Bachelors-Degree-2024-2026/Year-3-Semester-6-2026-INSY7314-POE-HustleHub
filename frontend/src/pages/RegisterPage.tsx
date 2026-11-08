import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BriefcaseIcon, CheckIcon, MailIcon, SparkIcon, UserIcon } from "../components/Icons.tsx";
import { PasswordField } from "../components/PasswordField.tsx";
import { RegisterVerifyStep } from "../components/RegisterVerifyStep.tsx";
import { sanitizeEmail, sanitizeUsername } from "../utils/sanitize.ts";
import { ApiError, startRegistration } from "../services/api.ts";
import { saveSession } from "../services/session.ts";
import { passwordRules, validateEmail, validatePassword, validateUsername } from "../utils/validation.ts";

type Role = "client" | "freelancer";
const ROLES = [
  { value: "client", title: "Hire talent", text: "I'm a client", Icon: BriefcaseIcon },
  { value: "freelancer", title: "Sell my skills", text: "I'm a freelancer", Icon: SparkIcon },
] as const;

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];

type Errors = {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
  list?: string[];
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  // Links like /register?role=freelancer open with that account type already picked
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role>(params.get("role") === "freelancer" ? "freelancer" : "client");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  // Set once the server has emailed a code, which switches the page to the code step
  const [pending, setPending] = useState<{ email: string; cooldown: number } | null>(null);

  const score = passwordRules.filter((rule) => rule.test(password)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Errors = {};
    // Sanitise first, then validate and send the cleaned values (passwords are never altered)
    const cleanUsername = sanitizeUsername(username);
    const cleanEmail = sanitizeEmail(email);
    const usernameError = validateUsername(cleanUsername);
    const emailError = validateEmail(cleanEmail);
    const passwordError = validatePassword(password);
    if (usernameError) next.username = usernameError;
    if (emailError) next.email = emailError;
    if (passwordError) next.password = passwordError;
    // Only checked here; the confirmation is never sent to the backend
    if (!confirm) next.confirm = "Re-enter your password.";
    else if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const started = await startRegistration({
        username: cleanUsername,
        email: cleanEmail,
        password,
        role,
      });
      setPending({ email: cleanEmail, cooldown: started.resendAfterSeconds });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message, list: err.errors });
      } else {
        setErrors({ form: "Registration failed." });
      }
    } finally {
      setLoading(false);
    }
  };

  // The account is only created once the emailed code has been confirmed
  if (pending) {
    return (
      <RegisterVerifyStep
        email={pending.email}
        initialCooldown={pending.cooldown}
        onVerified={(session) => {
          saveSession(session);
          navigate("/dashboard", { replace: true });
        }}
        onBack={() => setPending(null)}
      />
    );
  }

  return (
    <>
      <div className='form-heading'>
        <h2>Create your account</h2>
        <p>Pick how you will use HustleHub+</p>
      </div>

      {errors.form && (
        <div className='alert alert-danger' role='alert'>
          <span>
            {errors.form}
            {errors.list && errors.list.length > 0 && (
              <ul>
                {errors.list.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className='form-stack'>
        <fieldset className='role-fieldset'>
          <legend className='label'>I'm here to</legend>
          <div className='role-pick'>
            {ROLES.map(({ value, title, text, Icon }) => (
              <button
                key={value}
                type='button'
                className='role-card'
                aria-pressed={role === value}
                onClick={() => setRole(value)}
              >
                <span className='role-icon'>
                  <Icon size={20} />
                </span>
                <span className='role-text'>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
                <span className='role-check'>
                  <CheckIcon size={12} />
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className='field-wrap'>
          <label className='label' htmlFor='reg-username'>
            Username
          </label>
          <div className='input-wrap'>
            <span className='input-icon'>
              <UserIcon />
            </span>
            <input
              id='reg-username'
              className={`field ${errors.username ? "bad" : ""}`}
              autoComplete='username'
              maxLength={30}
              placeholder='Enter your username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors.username}
            />
          </div>
          {errors.username && <span className='err-text'>{errors.username}</span>}
        </div>

        <div className='field-wrap'>
          <label className='label' htmlFor='reg-email'>
            Email
          </label>
          <div className='input-wrap'>
            <span className='input-icon'>
              <MailIcon />
            </span>
            <input
              id='reg-email'
              className={`field ${errors.email ? "bad" : ""}`}
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
          <div className='label-row'>
            <label className='label' htmlFor='reg-password'>
              Password
            </label>
            {password && (
              <span className={`strength-label level-${score}`} aria-live='polite'>
                {STRENGTH[score]}
              </span>
            )}
          </div>
          <PasswordField
            id='reg-password'
            value={password}
            onChange={setPassword}
            autoComplete='new-password'
            invalid={!!errors.password}
            describedBy='password-rules'
          />
          {/* One bar per backend rule, with its label underneath */}
          <ul className={`checks level-${score}`} id='password-rules'>
            {passwordRules.map((rule) => (
              <li key={rule.label} className={rule.test(password) ? "met" : ""}>
                <span className='check-bar' />
                <span className='check-text'>
                  <CheckIcon size={11} />
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
          {errors.password && <span className='err-text'>{errors.password}</span>}
        </div>

        <div className='field-wrap'>
          <label className='label' htmlFor='reg-confirm'>
            Confirm password
          </label>
          <PasswordField
            id='reg-confirm'
            value={confirm}
            onChange={setConfirm}
            autoComplete='new-password'
            placeholder='Re-enter your password'
            invalid={!!errors.confirm}
            valid={!!confirm && confirm === password}
          />
          {errors.confirm && <span className='err-text'>{errors.confirm}</span>}
        </div>

        <button className='btn btn-block' type='submit' disabled={loading}>
          {loading && "Sending code..."}
          {!loading && "Send verification code"}
        </button>
      </form>
    </>
  );
};
