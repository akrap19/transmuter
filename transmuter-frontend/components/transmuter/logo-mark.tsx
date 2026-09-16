type LogoMarkProps = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 26, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="tmLogoGold"
          x1="32"
          y1="2"
          x2="32"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="0.55" stopColor="#F0C24B" />
          <stop offset="1" stopColor="#8A6420" />
        </linearGradient>
        <linearGradient
          id="tmLogoGoldSoft"
          x1="32"
          y1="14"
          x2="32"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="1" stopColor="#C99A2E" />
        </linearGradient>
      </defs>
      <path
        d="M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z"
        fill="#0A0C11"
        stroke="url(#tmLogoGold)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <line
        x1="32"
        y1="10"
        x2="32"
        y2="19"
        stroke="url(#tmLogoGoldSoft)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <line
        x1="32"
        y1="45"
        x2="32"
        y2="54"
        stroke="url(#tmLogoGoldSoft)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle
        cx="32"
        cy="32"
        r="12"
        stroke="url(#tmLogoGoldSoft)"
        strokeWidth="3.5"
      />
      <circle cx="32" cy="32" r="4.5" fill="url(#tmLogoGoldSoft)" />
    </svg>
  );
}
