import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconSun = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const IconCheckSquare = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    <path d="M8.5 11.5l3 3L22 4" />
  </svg>
)

export const IconMap = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M1 6l7-3 8 4 7-3v15l-7 3-8-4-7 3z" />
    <path d="M8 3v13M16 7v14" />
  </svg>
)

export const IconFileText = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h5" />
  </svg>
)

export const IconLayers = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2L2 7l10 5 10-5z" />
    <path d="M2 12l10 5 10-5M2 17l10 5 10-5" />
  </svg>
)

export const IconChart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
)

export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
)

export const IconPause = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </svg>
)

export const IconRotate = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

export const IconSkip = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 4l10 8-10 8z" fill="currentColor" stroke="none" />
    <path d="M19 4v16" />
  </svg>
)

export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
)

export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={3} {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)

export const IconMoon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z" />
  </svg>
)

export const IconClock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
)

export const IconFlame = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 22c4 0 7-2.9 7-6.7 0-4.6-4-6.6-4-10.3 0-1.2-.6-2-1.5-2.5.3 3-2 4.5-3.6 6.3C8.2 10.6 5 12.3 5 15.3 5 19.1 8 22 12 22z" />
  </svg>
)

export const IconBook = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

export const IconExternal = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6M10 14L21 3" />
  </svg>
)

export const IconGlobe = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 3.6 5.6 3.6 9s-1.1 6.5-3.6 9c-2.5-2.5-3.6-5.6-3.6-9S9.5 5.5 12 3z" />
  </svg>
)

export const IconVocabulary = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M2 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z" />
    <path d="M22 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z" />
  </svg>
)
