import type { ReactNode } from "react";

// Extra icons for the marketplace pages. The existing icons stay in Icons.tsx.
const svg = (size: number, children: ReactNode, sw = 2) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={sw}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    {children}
  </svg>
);

export const SearchIcon = () =>
  svg(
    20,
    <>
      <circle cx='11' cy='11' r='7' />
      <path d='m20 20-3.5-3.5' />
    </>,
  );
export const WarnIcon = () =>
  svg(
    18,
    <>
      <path d='M12 9v4' />
      <path d='M12 17h.01' />
      <path d='M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
    </>,
  );
export const ClockIcon = () =>
  svg(
    18,
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 7v5l3 2' />
    </>,
  );
export const BackIcon = () =>
  svg(
    16,
    <>
      <path d='M19 12H5' />
      <path d='m11 18-6-6 6-6' />
    </>,
  );
export const EditIcon = () => svg(18, <path d='M4 20h4L19 9l-4-4L4 16v4z' />);
export const TrashIcon = () =>
  svg(
    18,
    <>
      <path d='M4 7h16' />
      <path d='M10 11v6' />
      <path d='M14 11v6' />
      <path d='M6 7l1 13h10l1-13' />
      <path d='M9 7V4h6v3' />
    </>,
  );
export const PlusIcon = () =>
  svg(
    16,
    <>
      <path d='M12 5v14' />
      <path d='M5 12h14' />
    </>,
    2.6,
  );
export const ShieldIcon = () => svg(18, <path d='M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z' />);
