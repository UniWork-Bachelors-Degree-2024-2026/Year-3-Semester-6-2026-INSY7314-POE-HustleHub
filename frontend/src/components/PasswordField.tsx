import React, { useState } from "react";
import { LockIcon } from "./Icons.tsx";

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  invalid?: boolean;
  valid?: boolean;
  placeholder?: string;
  describedBy?: string;
}

//DownloadIcons (2026) demonstrates a collection of free icons which assisted this implementation.
export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  valid,
  placeholder = "Enter your password",
  describedBy,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className='input-wrap password-wrap'>
      <span className='input-icon'>
        <LockIcon />
      </span>
      <input
        id={id}
        className={`field ${invalid ? "bad" : valid ? "good" : ""}`}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        maxLength={128}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <button
        type='button'
        className='peek-btn'
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
            <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
            <path d='M14.12 14.12a3 3 0 1 1-4.24-4.24' />
            <line x1='1' y1='1' x2='23' y2='23' />
          </svg>
        ) : (
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
            <circle cx='12' cy='12' r='3' />
          </svg>
        )}
      </button>
    </div>
  );
};
//Reference List
//DownloadIcons, 2026. 89K+ Free Iconsfrom 21 Libraries. [online] Available at: <https://downloadicons.com/> [Accessed 07 October 2026].
