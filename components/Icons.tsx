"use client";

// Valkea ikon seti — tutarlı 24px stroke ikonlar (emoji yerine).

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };

function base({ size = 20, strokeWidth = 2, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const IHome = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.8Z" />
  </svg>
);

export const IBriefcase = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="7" width="18" height="13" rx="3" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12.5h18" />
  </svg>
);

export const IWallet = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 7H5a2 2 0 0 1 0-4h12v4" />
    <path d="M3 5v13a3 3 0 0 0 3 3h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" />
    <circle cx="16.5" cy="14" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const ISparkle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l1.9 4.9L18.8 9.8l-4.9 1.9L12 16.6l-1.9-4.9L5.2 9.8l4.9-1.9L12 3z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </svg>
);

export const IUser = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const IUsers = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
    <path d="M16 5a3.4 3.4 0 0 1 0 6.5M17.5 14.5a6.2 6.2 0 0 1 3.7 5.5" />
  </svg>
);

export const IBell = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
    <path d="M10.2 20a2 2 0 0 0 3.6 0" />
  </svg>
);

export const ICalendar = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </svg>
);

export const ICard = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
    <path d="M2.5 10h19M6.5 14.5h4" />
  </svg>
);

export const IReceipt = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21V3z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export const IChart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4v15a1 1 0 0 0 1 1h15" />
    <path d="M8 15v-4M12.5 15V7M17 15v-6" />
  </svg>
);

export const ITrendUp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
);

export const ITrendDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M15 17h6v-6" />
  </svg>
);

export const ICheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const ICheckCircle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.4l2.4 2.4 4.6-5" />
  </svg>
);

export const IClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);

export const IAlert = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5l9.5 16.5h-19L12 3.5z" />
    <path d="M12 10v4M12 17.2v.3" />
  </svg>
);

export const ITrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6.5h16M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M6 6.5l1 13a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 19.5l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IEdit = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16.5 3.8a2.2 2.2 0 0 1 3.1 3.1L8.4 18.1 4 19.4l1.3-4.4L16.5 3.8z" />
  </svg>
);

export const IPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IArrowLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

export const IArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const IChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IMic = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);

export const ICamera = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9a2 2 0 0 1 2-2h1.2a2 2 0 0 0 1.6-.8l1-1.4A2 2 0 0 1 10.4 4h3.2a2 2 0 0 1 1.6.8l1 1.4a2 2 0 0 0 1.6.8H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const ISend = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />
  </svg>
);

export const IBanknote = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 9.5v.1M18 14.4v.1" />
  </svg>
);

export const ILira = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3v15a4 4 0 0 0 8-1" />
    <path d="M6 9.5l7-3M6 13.5l7-3" />
  </svg>
);

export const IBuilding = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2M10 20.5v-2.5h4v2.5" />
  </svg>
);

export const IHomeAlt = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.8Z" />
    <path d="M9.5 21v-7h5v7" />
  </svg>
);

export const IZap = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2 4.5 13.5h6L11 22l8.5-11.5h-6L13 2z" />
  </svg>
);

export const IDroplet = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.7s6.5 6.6 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 9.3 12 2.7 12 2.7z" />
  </svg>
);

export const IFlame = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5S6 8 6 13.5a6 6 0 0 0 12 0c0-2-1-4-2.5-5.5 0 1.5-.7 2.7-2 3.5C13 9 13 5 12 2.5z" />
  </svg>
);

export const IGlobe = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
  </svg>
);

export const IPhone = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 4h3.5l1.5 4.5L7.8 10a12 12 0 0 0 6.2 6.2l1.5-2.2L20 15.5V19a2 2 0 0 1-2 2C9.7 21 3 14.3 3 6a2 2 0 0 1 2-2z" />
  </svg>
);

export const ITv = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
    <path d="M8 3.5l4 3 4-3" />
  </svg>
);

export const IShield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6l8-3z" />
  </svg>
);

export const IFile = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2.5h8L19 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4A1.5 1.5 0 0 1 6.5 2.5H6z" />
    <path d="M14 2.5v5h5" />
  </svg>
);

export const ICar = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14a2 2 0 0 1 2 2v4h-2.5M5 11a2 2 0 0 0-2 2v4h2.5M8.5 17h7" />
    <circle cx="7" cy="17" r="1.7" />
    <circle cx="17" cy="17" r="1.7" />
  </svg>
);

export const IBank = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9.5 12 4l9 5.5M4.5 9.5V18M9 9.5V18M15 9.5V18M19.5 9.5V18M3 18h18v2.5H3V18z" />
  </svg>
);

export const ILogout = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h-7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7M10 12h11M17 8l4 4-4 4" />
  </svg>
);

export const IDownload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v11M7.5 10.5 12 15l4.5-4.5M4 18.5h16" />
  </svg>
);

export const IMessage = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" />
  </svg>
);

export const IKey = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="15" r="4.5" />
    <path d="M11.2 11.8 20 3M16 7l3 3M13.5 9.5l2 2" />
  </svg>
);

export const ILock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IInbox = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4.5h16V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V4.5z" />
    <path d="M4 13h4.5a3.5 3.5 0 0 0 7 0H20" />
  </svg>
);

export const IPlayCircle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l5.5 3.5-5.5 3.5v-7z" />
  </svg>
);
