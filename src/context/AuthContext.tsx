import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole, Profile, UserRoleRecord } from '../types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: UserRoleRecord[]
  activeRole: UserRole | null
  loading: boolean
  isSuperAdmin: boolean
  isOrganizer: boolean
  isVenueAdmin: boolean
  isTeamLeader: boolean
  isParticipant: boolean
  isJudge: boolean
  isVolunteerScanner: boolean
  hasRole: (role: UserRole) => boolean
  setActiveRole: (role: UserRole) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserRoleRecord[]>([])
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(() => {
    return (localStorage.getItem('hackos_active_role') as UserRole) || null
  })
  const [loading, setLoading] = useState(true)

  const setActiveRole = (role: UserRole) => {
    localStorage.setItem('hackos_active_role', role)
    setActiveRoleState(role)
  }

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (data) setProfile(data as Profile)
  }

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
    if (data) {
      const records = data as UserRoleRecord[]
      setRoles(records)
      
      // Auto-select role if none selected or current is invalid
      const currentActive = localStorage.getItem('hackos_active_role') as UserRole | null
      const hasCurrent = records.some(r => 
        r.role === currentActive ||
        (currentActive === 'super_admin' && r.role === 'admin') ||
        (currentActive === 'admin' && r.role === 'super_admin') ||
        (currentActive === 'venue_admin' && r.role === 'venue_authority') ||
        (currentActive === 'venue_authority' && r.role === 'venue_admin')
      )

      if (!hasCurrent && records.length > 0) {
        const defaultRole = records[0].role
        localStorage.setItem('hackos_active_role', defaultRole)
        setActiveRoleState(defaultRole)
      }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)])
    }
  }

  const signOut = async () => {
    localStorage.removeItem('hackos_active_role')
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    setRoles([])
    setActiveRoleState(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        Promise.all([fetchProfile(session.user.id), fetchRoles(session.user.id)]).finally(() =>
          setLoading(false),
        )
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchRoles(session.user.id)
      } else {
        localStorage.removeItem('hackos_active_role')
        setProfile(null)
        setRoles([])
        setActiveRoleState(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const hasRole = (role: UserRole): boolean => {
    return roles.some(r => {
      if (r.status !== 'active') return false
      if (r.role === role) return true
      if (role === 'super_admin' && r.role === 'admin') return true
      if (role === 'admin' && r.role === 'super_admin') return true
      if (role === 'venue_admin' && r.role === 'venue_authority') return true
      if (role === 'venue_authority' && r.role === 'venue_admin') return true
      return false
    })
  }

  const isSuperAdmin = useMemo(() => hasRole('super_admin') || hasRole('admin'), [roles])
  const isOrganizer = useMemo(() => hasRole('organizer'), [roles])
  const isVenueAdmin = useMemo(() => hasRole('venue_admin') || hasRole('venue_authority'), [roles])
  const isTeamLeader = useMemo(() => hasRole('team_leader'), [roles])
  const isParticipant = useMemo(() => hasRole('participant'), [roles])
  const isJudge = useMemo(() => hasRole('judge'), [roles])
  const isVolunteerScanner = useMemo(() => hasRole('volunteer_scanner'), [roles])

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        activeRole,
        loading,
        isSuperAdmin,
        isOrganizer,
        isVenueAdmin,
        isTeamLeader,
        isParticipant,
        isJudge,
        isVolunteerScanner,
        hasRole,
        setActiveRole,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
