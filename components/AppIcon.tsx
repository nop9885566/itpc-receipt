import type { ReactNode } from 'react';

export type AppIconName = 'receipt' | 'box' | 'plus' | 'search' | 'download' | 'arrow' | 'calendar' | 'check';

const paths: Record<AppIconName, ReactNode> = {
  receipt: <>
    <path d="M6 3.75h12a1.5 1.5 0 0 1 1.5 1.5v15l-3-1.8-3 1.8-3-1.8-3 1.8v-15a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </>,
  box: <>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21M8 5.3l8 4.5" />
  </>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.5 15.5 4 4" />
  </>,
  download: <>
    <path d="M12 3.5v11m0 0 4-4m-4 4-4-4" />
    <path d="M5 15.5v4h14v-4" />
  </>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  calendar: <>
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
    <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" />
  </>,
  check: <path d="m5 12 4.2 4.2L19 6.5" />,
};

export default function AppIcon({ name, size = 20 }: { name: AppIconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
