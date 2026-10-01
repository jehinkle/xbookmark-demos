const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const IconChevron = ({ dir = 'down', size = 18 }) => {
  const rot = { down: 0, up: 180, left: 90, right: -90 }[dir]
  return (
    <svg {...base} width={size} height={size} style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
export const IconClose = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconSearch = ({ size = 20 }) => (
  <svg {...base} width={size} height={size} strokeWidth={2.2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)
export const IconHeart = ({ filled, size = 22 }) => (
  <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.8}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </svg>
)
export const IconFlag = ({ filled, size = 18 }) => (
  <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </svg>
)
export const IconNote = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </svg>
)
export const IconFilter = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
)
export const IconPin = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M12 21s-6-5.6-6-11a6 6 0 1112 0c0 5.4-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
)
export const IconLink = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
  </svg>
)
export const IconInfo = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5v.5" />
  </svg>
)
export const IconLogo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="9" fill="#1d4ed8" />
    <path d="M12 7v7l-5 9a2 2 0 001.8 3h14.4a2 2 0 001.8-3l-5-9V7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 7h11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9.5 20.5h13" stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)
