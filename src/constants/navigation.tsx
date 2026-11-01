import type { ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

export function OverviewIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3 8.5h14M8.5 8.5V17" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function DiscoverIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 8 4 2-2 4-4-2 2-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

export function ApplicationsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 2.5V7h4M8 11h4M8 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SquadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M7.5 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12.5 7.5a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167ZM2.5 15v-.833a4.167 4.167 0 0 1 8.333 0V15M12.5 15v-.833a3.333 3.333 0 0 0-2.5-3.225"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function QrPassIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12h2v2h-2zM15 15h2v2h-2zM12 16h1v1h-1zM16 12h1v1h-1z" fill="currentColor" />
    </svg>
  )
}

export const PARTICIPANT_NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/participant', icon: <OverviewIcon /> },
  { label: 'Discover', href: '/participant/discover', icon: <DiscoverIcon /> },
  { label: 'My Applications', href: '/participant/applications', icon: <ApplicationsIcon /> },
  { label: 'My Squad & Codes', href: '/team/my-team', icon: <SquadIcon /> },
  { label: 'My QR Pass', href: '/participant/qr-pass', icon: <QrPassIcon /> },
]
