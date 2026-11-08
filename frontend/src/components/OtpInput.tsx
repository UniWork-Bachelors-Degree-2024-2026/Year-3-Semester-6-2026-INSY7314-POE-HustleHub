import React, { useRef } from "react";
import { digitsOnly } from "../utils/sanitize.ts";
import { OTP_LENGTH } from "../utils/validation.ts";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
}

const POSITIONS = Array.from({ length: OTP_LENGTH }, (_, index) => index);

// Six single digit boxes that behave like one field: typing advances, backspace steps back, paste fills all.
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  disabled,
  invalid,
  autoFocus,
  label = "Verification code",
}) => {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (index: number) => {
    const target = Math.min(Math.max(index, 0), OTP_LENGTH - 1);
    const box = boxes.current[target];
    if (box) box.focus();
  };

  // Writes digits from the given box onwards, then moves focus to the next empty box.
  const fill = (start: number, raw: string) => {
    const incoming = digitsOnly(raw, OTP_LENGTH);
    if (!incoming) return;
    const next = (value.slice(0, start) + incoming).slice(0, OTP_LENGTH);
    onChange(next);
    focusBox(next.length);
  };

  const handleChange = (index: number, raw: string) => {
    const typed = digitsOnly(raw, OTP_LENGTH);
    if (!typed) {
      // The box was cleared, so its digit is removed and later digits shift left
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    fill(index, typed);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    const isEmpty = index >= value.length;
    if (event.key === "Backspace" && isEmpty && index > 0) {
      event.preventDefault();
      onChange(value.slice(0, index - 1));
      focusBox(index - 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fill(index, event.clipboardData.getData("text"));
  };

  return (
    <div className='otp-row' role='group' aria-label={label}>
      {POSITIONS.map((index) => {
        const classes = ["field", "otp-box"];
        if (invalid) classes.push("bad");

        return (
          <input
            key={index}
            ref={(element) => {
              boxes.current[index] = element;
            }}
            className={classes.join(" ")}
            type='text'
            // numeric asks phones for the digit keypad but does not validate, so digitsOnly still runs (MDN Web Docs, 2026i).
            inputMode='numeric'
            // one-time-code lets browsers offer the code from an email or SMS (MDN Web Docs, 2026h).
            autoComplete='one-time-code'
            maxLength={OTP_LENGTH}
            aria-label={`${label}, digit ${index + 1} of ${OTP_LENGTH}`}
            aria-invalid={invalid}
            value={value.charAt(index)}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.target.select()}
          />
        );
      })}
    </div>
  );
};

// Reference List:
// MDN Web Docs, 2026h. HTML attribute: autocomplete. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete> [Accessed 10 October 2026].
// MDN Web Docs, 2026i. inputmode global attribute. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode> [Accessed 10 October 2026].
