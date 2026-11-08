import React from "react";

type IconProps = { size?: number };

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 18, children }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    {children}
  </svg>
);

export const UserIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx='12' cy='8' r='4' />
    <path d='M4 21a8 8 0 0 1 16 0' />
  </Svg>
);

export const MailIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x='3' y='5' width='18' height='14' rx='2' />
    <path d='m3 7 9 6 9-6' />
  </Svg>
);

export const LockIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x='4' y='11' width='16' height='10' rx='2' />
    <path d='M8 11V7a4 4 0 0 1 8 0v4' />
  </Svg>
);

export const BriefcaseIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x='3' y='7' width='18' height='13' rx='2' />
    <path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18' />
  </Svg>
);

export const SparkIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d='M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z' />
    <path d='M19 16v4M17 18h4' />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d='m5 12 5 5 9-10' />
  </Svg>
);
