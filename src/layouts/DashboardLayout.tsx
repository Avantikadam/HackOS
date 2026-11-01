import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'
import { Wordmark } from '../components/Nav'
import { CAST, Character } from '../components/characters/Character'
import { AvatarPicker } from '../components/dashboard/AvatarPicker'
import type { NavItem } from '../constants/navigation'

export interface DashboardLayoutProps {
  children: ReactNode
  navItems: NavItem[]
  roleLabel: string
  roleColor: 'cobalt' | 'sage' | 'coral' | 'amber' | 'purple' | 'indigo'
}

export function DashboardLayout({ children, navItems, roleLabel, roleColor }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  const roleBadgeStyles = {
    cobalt: 'bg-cobalt-tint text-cobalt border-cobalt/20',
    sage: 'bg-sage-tint text-sage border-sage/20',
    coral: 'bg-coral-tint text-coral border-coral/20',
    amber: 'bg-amber-tint text-[#8a5a10] border-amber/25',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }[roleColor] || 'bg-cobalt-tint text-cobalt border-cobalt/20'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const avatarKey = profile?.avatar_url && CAST[profile.avatar_url] ? profile.avatar_url : 'ada'
  const charConfig = CAST[avatarKey]

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-white select-none">
      {/* Top Section: Branding & Navigation */}
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="border-b border-line/70 px-5 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="rounded-lg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cobalt/30"
              aria-label="HACKOS home"
            >
              <Wordmark />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>

          {/* Role Pill & Switcher */}
          <div className="mt-3.5 flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold tracking-wide',
                roleBadgeStyles
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {roleLabel}
            </span>
            <Link
              to="/select-role"
              className="group inline-flex items-center gap-1 text-[0.74rem] font-medium text-ink-muted transition-colors hover:text-cobalt"
            >
              <span>Switch role</span>
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-ink-muted/80 transition-transform group-hover:translate-x-0.5 group-hover:text-cobalt">
                <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3.5 py-4">
          <p className="px-3 pb-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-ink-muted/70">
            Navigation
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active =
                location.pathname === item.href ||
                (item.href !== '/organizer' &&
                  item.href !== '/participant' &&
                  item.href !== '/venue' &&
                  location.pathname.startsWith(item.href))

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.84rem] transition-all duration-150',
                      active
                        ? 'bg-cobalt text-white font-semibold shadow-xs'
                        : 'text-ink-soft font-medium hover:bg-parchment hover:text-ink'
                    )}
                  >
                    <span className={cn('h-4 w-4 shrink-0 transition-opacity', active ? 'text-white' : 'text-ink-muted/80')}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* User profile footer */}
      <div className="border-t border-line/70 bg-white p-3.5">
        <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-parchment/40 p-2.5">
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            title="Change Avatar"
            className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-white p-0.5 transition-transform hover:scale-105 shadow-2xs"
          >
            <div className="h-full w-full overflow-hidden rounded-full">
              <Character config={charConfig} title={profile?.full_name || 'Avatar'} />
            </div>
            <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-[0.52rem] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
              Edit
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-semibold text-ink">
              {profile?.full_name || 'User'}
            </p>
            <p className="truncate text-[0.72rem] text-ink-muted">{profile?.email || ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-line/70 bg-white px-2.5 py-1.5 text-[0.76rem] font-medium text-ink-muted transition-colors hover:border-line hover:bg-parchment hover:text-ink"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-ink-muted">
            <path d="M6 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H6M10.5 11.5 14 8l-3.5-3.5M14 8H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-ivory text-ink">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line/70 bg-white lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-white shadow-xl transition-transform duration-200 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-ivory/95 px-4 backdrop-blur-xs lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:border-ink/30 active:scale-95 transition-all"
              aria-label="Open navigation menu"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <Wordmark />
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold', roleBadgeStyles)}>
            {roleLabel}
          </span>
        </header>

        {/* Page content */}
        <main className="relative z-10 flex-1 p-5 sm:p-7 md:p-8">{children}</main>
      </div>

      <AvatarPicker isOpen={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </div>
  )
}
