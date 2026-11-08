// Accessible on/off switch (a button with role="switch").
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  id: string;
}) {
  return (
    <div className='pf-toggle-row'>
      <span className='pf-toggle-copy'>
        <label htmlFor={id}>{label}</label>
        {hint && <small>{hint}</small>}
      </span>
      <button
        id={id}
        type='button'
        role='switch'
        aria-checked={checked}
        className={`pf-switch ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className='pf-switch-knob' />
      </button>
    </div>
  );
}
