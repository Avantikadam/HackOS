import { supabase } from '../lib/supabase'
import type { Team, TeamMember, Event } from '../types/database'

export interface ExtendedTeam extends Team {
  event?: Event
  members: TeamMember[]
  member_count: number
  is_leader: boolean
}

export interface JoinTeamResult {
  success: boolean
  already_member?: boolean
  team_id?: string
  team_name?: string
  event_id?: string
  message: string
}

/**
 * Join a team atomically using its cryptographic team code
 */
export async function joinTeamByCode(teamCode: string): Promise<JoinTeamResult> {
  const cleanCode = teamCode.trim().toUpperCase()
  if (!cleanCode) {
    throw new Error('Please enter a valid team code.')
  }

  const { data, error } = await supabase.rpc('join_team_by_code', {
    p_team_code: cleanCode,
  })

  if (error) {
    throw new Error(error.message || 'Failed to join team.')
  }

  return data as JoinTeamResult
}

/**
 * Fetch all teams for the current user (either as leader or accepted member)
 */
export async function fetchUserTeams(userId: string): Promise<ExtendedTeam[]> {
  // 1. Teams where user is leader
  const { data: leaderTeams, error: leaderErr } = await supabase
    .from('teams')
    .select('*, event:events(*), members:team_members(*)')
    .eq('team_leader_id', userId)

  if (leaderErr) {
    console.error('Error fetching leader teams:', leaderErr)
  }

  // 2. Teams where user is a team member
  const { data: memberRows, error: memberErr } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('invitation_status', 'accepted')

  if (memberErr) {
    console.error('Error fetching member teams:', memberErr)
  }

  const memberTeamIds = (memberRows || []).map((r) => r.team_id)

  let memberTeams: any[] = []
  if (memberTeamIds.length > 0) {
    const { data, error } = await supabase
      .from('teams')
      .select('*, event:events(*), members:team_members(*)')
      .in('id', memberTeamIds)

    if (!error && data) {
      memberTeams = data
    }
  }

  // Combine and deduplicate
  const map = new Map<string, ExtendedTeam>()

  for (const t of leaderTeams || []) {
    map.set(t.id, {
      ...t,
      is_leader: true,
      member_count: (t.members || []).length,
    })
  }

  for (const t of memberTeams) {
    if (!map.has(t.id)) {
      map.set(t.id, {
        ...t,
        is_leader: t.team_leader_id === userId,
        member_count: (t.members || []).length,
      })
    }
  }

  return Array.from(map.values())
}

/**
 * Fetch detailed team information by ID
 */
export async function fetchTeamDetails(teamId: string): Promise<ExtendedTeam | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, event:events(*), members:team_members(*)')
    .eq('id', teamId)
    .maybeSingle()

  if (error || !data) {
    console.error('Error fetching team details:', error)
    return null
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id

  return {
    ...data,
    is_leader: data.team_leader_id === userId,
    member_count: (data.members || []).length,
  } as ExtendedTeam
}

