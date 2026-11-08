import type { ReactNode } from "react";

// Icons used only by the profile page. Same stroke style as Icons.tsx and MarketIcons.tsx.
const svg = (size: number, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    {children}
  </svg>
);

type P = { size?: number };

export const CameraIcon = ({ size = 18 }: P) =>
  svg(
    size,
    <>
      <path d='M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z' />
      <circle cx='12' cy='13.5' r='3.5' />
    </>,
  );

export const UploadIcon = ({ size = 18 }: P) =>
  svg(
    size,
    <>
      <path d='M12 16V4' />
      <path d='m7 9 5-5 5 5' />
      <path d='M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3' />
    </>,
  );

export const PinIcon = ({ size = 16 }: P) =>
  svg(
    size,
    <>
      <path d='M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z' />
      <circle cx='12' cy='9.5' r='2.5' />
    </>,
  );

export const GlobeIcon = ({ size = 16 }: P) =>
  svg(
    size,
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M3 12h18' />
      <path d='M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z' />
    </>,
  );

export const LinkedInIcon = ({ size = 16 }: P) =>
  svg(
    size,
    <>
      <rect x='3' y='3' width='18' height='18' rx='3' />
      <path d='M8 11v5' />
      <path d='M8 8v.01' />
      <path d='M12 16v-5' />
      <path d='M12 13a2.5 2.5 0 0 1 5 0v3' />
    </>,
  );

export const BuildingIcon = ({ size = 16 }: P) =>
  svg(
    size,
    <>
      <path d='M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16' />
      <path d='M14 10h5a1 1 0 0 1 1 1v10' />
      <path d='M8 8h2M8 12h2M8 16h2M2 21h20' />
    </>,
  );

export const CloseIcon = ({ size = 16 }: P) => svg(size, <path d='M6 6l12 12M18 6 6 18' />);

export const BellIcon = ({ size = 18 }: P) =>
  svg(
    size,
    <>
      <path d='M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2z' />
      <path d='M10 21a2 2 0 0 0 4 0' />
    </>,
  );

export const KeyIcon = ({ size = 18 }: P) =>
  svg(
    size,
    <>
      <circle cx='8' cy='15' r='4' />
      <path d='m11 12 9-9' />
      <path d='m16 7 3 3' />
    </>,
  );

export const SaveIcon = ({ size = 16 }: P) =>
  svg(
    size,
    <>
      <path d='M5 4h11l3 3v13H5z' />
      <path d='M8 4v5h7V4' />
      <path d='M8 20v-6h8v6' />
    </>,
  );

export const MoveIcon = ({ size = 16 }: P) =>
  svg(size, <path d='M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3' />);
