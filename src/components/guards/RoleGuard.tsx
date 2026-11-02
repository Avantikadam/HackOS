import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../types/database'

export function RoleGuard({
  role,
  allowedRoles,
  children,
}: {
  role?: UserRole
  allowedRoles?: UserRole[]
  children: React.ReactNode
}) {
  const { activeRole, roles, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
      </div>
    )
  }

  const targets = allowedRoles || (role ? [role] : [])

  const matches = (r: UserRole, target: UserRole) => {
    if (r === target) return true
    if ((target === 'super_admin' || target === 'admin') && (r === 'super_admin' || r === 'admin')) return true
    if ((target === 'venue_admin' || target === 'venue_authority') && (r === 'venue_admin' || r === 'venue_authority')) return true
    return false
  }

  const isAuthorized = activeRole && targets.some(target => matches(activeRole, target))

  if (!isAuthorized) {
    // If user has an active matching role record in user_roles, they might just need activeRole updated
    const matchingRoleRecord = roles.find(r => r.status === 'active' && targets.some(t => matches(r.role, t)))
    if (!matchingRoleRecord) {
      return <Navigate to="/select-role" replace />
    }
  }

  return <>{children}</>
}
