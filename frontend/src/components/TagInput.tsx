import { useState, type KeyboardEvent } from "react";
import { CloseIcon } from "./ProfileIcons.tsx";
import { sanitizeText } from "../utils/sanitize.ts";
import { isSkill } from "../utils/profileValidation.ts";

// Skill picker: type and press Enter or comma, or tap a suggestion. Each tag is cleaned and checked before it is added.
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  max = 12,
  invalid,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  max?: number;
  invalid?: boolean;
}) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  const add = (raw: string) => {
    const tag = sanitizeText(raw, { max: 24 });
    if (!tag) return;
    if (!isSkill(tag)) return setNote("Use 2 to 24 letters or numbers (. + # & / - are fine).");
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return setNote("You already added that one.");
    if (value.length >= max) return setNote(`You can add up to ${max} skills.`);
    setNote("");
    setText("");
    onChange([...value, tag]);
  };

  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const open = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6);

  return (
    <div className='pf-tags'>
      <div className={`pf-tags-box field ${invalid ? "bad" : ""}`}>
        {value.map((t) => (
          <span key={t} className='pf-tag'>
            {t}
            <button type='button' aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}>
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className='pf-tags-input'
          value={text}
          maxLength={24}
          placeholder={value.length ? "Add another" : "Type a skill and press Enter"}
          onChange={(e) => {
            setText(e.target.value.replace(/[<>{}\\$`]/g, ""));
            setNote("");
          }}
          onKeyDown={key}
          onBlur={() => text.trim() && add(text)}
        />
      </div>
      {note && (
        <span className='err-text' role='status'>
          {note}
        </span>
      )}
      {open.length > 0 && value.length < max && (
        <div className='pf-suggest' aria-label='Suggested skills'>
          {open.map((s) => (
            <button key={s} type='button' className='pf-suggest-chip' onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
