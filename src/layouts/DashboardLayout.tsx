import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'
import { Wordmark } from '../components/Nav'
import { CAST, Character } from '../components/characters/Character'
import { AvatarPicker } from '../components/dashboard/AvatarPicker'
import { fetchNotifications, markAllNotificationsAsRead } from '../services/notificationService'
import type { Notification } from '../types/database'

interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

interface DashboardLayoutProps {
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
  const [notifications, setNotifications] = useState<Notification[]>([])

  const roleBadgeStyles = {
    cobalt: 'bg-cobalt-tint text-cobalt border-cobalt/20',
    sage: 'bg-sage-tint text-sage border-sage/20',
    coral: 'bg-coral-tint text-coral border-coral/20',
    amber: 'bg-amber-tint text-[#8a5a10] border-amber/25',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }[roleColor] || 'bg-cobalt-tint text-cobalt border-cobalt/20'

  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.id) return
      const data = await fetchNotifications(profile.id)
      setNotifications(data)
    }

    void loadNotifications()
  }, [profile?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const avatarKey = profile?.avatar_url && CAST[profile.avatar_url] ? profile.avatar_url : 'ada'
  const charConfig = CAST[avatarKey]

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-white">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
        <Link to="/" className="rounded-lg" aria-label="HACKOS home">
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-parchment hover:text-ink"
          aria-label="Close navigation menu"
        >
          ✕
        </button>
      </div>

      {/* Role Pill */}
      <div className="flex items-center justify-between border-b border-line/40 px-5 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold',
            roleBadgeStyles
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {roleLabel}
        </span>
        <Link
          to="/select-role"
          className="text-[0.75rem] font-medium text-ink-muted hover:text-cobalt"
        >
          Switch role
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
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
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-[0.85rem] font-medium transition-colors',
                    active
                      ? 'bg-cobalt text-white'
                      : 'text-ink-soft hover:bg-parchment/60 hover:text-ink'
                  )}
                >
                  <span className="h-4 w-4 shrink-0 opacity-80">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="border-t border-line/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.72rem] font-bold uppercase tracking-wider text-ink-muted">Notifications</p>
            <button
              type="button"
              onClick={async () => {
                if (!profile?.id) return
                await markAllNotificationsAsRead(profile.id)
                setNotifications([])
              }}
              className="text-[0.72rem] font-semibold text-cobalt hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className="rounded-xl border border-line bg-parchment/40 p-3">
                <p className="text-[0.8rem] font-semibold text-ink">{notification.title}</p>
                <p className="mt-0.5 text-[0.74rem] text-ink-muted">{notification.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User profile footer */}
      <div className="border-t border-line/60 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            title="Change Avatar"
            className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-parchment p-0.5 transition-transform hover:scale-105"
          >
            <div className="h-full w-full overflow-hidden rounded-full">
              <Character config={charConfig} title={profile?.full_name || 'Avatar'} />
            </div>
            <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-[0.55rem] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
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
          className="mt-2.5 w-full rounded-lg border border-line/70 bg-white px-2.5 py-1.5 text-[0.78rem] font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-ivory text-ink">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 border-r border-line/70 bg-white lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[240px] border-r border-line bg-white transition-transform duration-200 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-ivory/95 px-4 backdrop-blur-xs lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:border-ink/30 active:scale-95"
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
        <main className="relative z-10 flex-1 p-5 sm:p-7">{children}</main>
      </div>

      <AvatarPicker isOpen={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </div>
  )
}
