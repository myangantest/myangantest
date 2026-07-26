import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function MyAnganLogo({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="9.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* 'M' Path */}
      <path d="M 22,65 V 28 C 22,21 31,21 33,25 L 43,48 C 43.5,49.5 45.5,49.5 46,48 L 56,25 C 58,21 67,21 67,28 V 53" />
      {/* 'A' Path */}
      <path d="M 52,72 L 68,38 L 84,72" />
    </svg>
  );
}
