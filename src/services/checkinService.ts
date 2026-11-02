import { supabase } from '../lib/supabase'
import type { Event, EventAttendanceRecord } from '../types/database'
import {
  saveOfflineScan,
  getPendingScans,
  markScansSynced,
  type PendingScan,
} from '../utils/offlineStore'

export interface QrPassResponse {
  success: boolean
  pass_id: string
  qr_token: string
  event_id: string
  is_active: boolean
}

export interface SyncAttendanceResult {
  success: boolean
  synced_count: number
  duplicate_count: number
  error_count: number
}

/**
 * Get or create an opaque QR pass for an event (ZERO PII)
 */
export async function getOrCreateParticipantQrPass(eventId: string): Promise<QrPassResponse> {
  const { data, error } = await supabase.rpc('get_or_create_qr_pass', {
    p_event_id: eventId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to generate QR pass.')
  }

  return data as QrPassResponse
}

/**
 * Fetch all published events where the user is an accepted participant or team leader
 */
export async function fetchUserRegisteredEvents(userId: string): Promise<Event[]> {
  // Only events where the user belongs to a team with an accepted application.
  const { data: acceptedApps } = await supabase
    .from('applications')
    .select('event_id, team:teams(team_leader_id, members:team_members(user_id, invitation_status))')
    .eq('application_status', 'accepted')

  const eventIds = new Set<string>()
  for (const app of acceptedApps || []) {
    const team = (app as any).team
    if (!team) continue
    if (team.team_leader_id === userId) {
      eventIds.add(app.event_id)
      continue
    }
    const members = Array.isArray(team.members) ? team.members : []
    for (const member of members) {
      if (member.user_id === userId && member.invitation_status === 'accepted') {
        eventIds.add(app.event_id)
        break
      }
    }
  }

  if (eventIds.size === 0) return []

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .in('id', Array.from(eventIds))
    .eq('publication_status', 'published')

  if (error) {
    console.error('Error fetching registered events:', error)
    return []
  }

  return (events || []) as Event[]
}

/**
 * Record a check-in locally in IndexedDB first, then attempt immediate sync if online
 */
export async function recordCheckInScan(
  eventId: string,
  qrToken: string
): Promise<{ client_scan_id: string; synced: boolean; result?: SyncAttendanceResult }> {
  const clientScanId = 'SCAN_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now()

  const scanRecord: PendingScan = {
    client_scan_id: clientScanId,
    qr_token: qrToken.trim(),
    event_id: eventId,
    scanned_at: new Date().toISOString(),
    device_info: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      online: navigator.onLine,
    },
    synced: false,
    status: 'pending',
  }

  // 1. Save to local IndexedDB (guarantees offline survival)
  await saveOfflineScan(scanRecord)

  // 2. If online, attempt background sync
  if (navigator.onLine) {
    try {
      const syncRes = await syncPendingScans(eventId)
      return { client_scan_id: clientScanId, synced: true, result: syncRes }
    } catch {
      // Stay offline / pending safely
      return { client_scan_id: clientScanId, synced: false }
    }
  }

  return { client_scan_id: clientScanId, synced: false }
}

/**
 * Push all pending offline scans to the server idempotently
 */
export async function syncPendingScans(eventId?: string): Promise<SyncAttendanceResult> {
  const pending = await getPendingScans(eventId)
  if (pending.length === 0) {
    return { success: true, synced_count: 0, duplicate_count: 0, error_count: 0 }
  }

  const payload = pending.map((s) => ({
    client_scan_id: s.client_scan_id,
    qr_token: s.qr_token,
    event_id: s.event_id,
    scanned_at: s.scanned_at,
    device_info: s.device_info,
  }))

  const { data, error } = await supabase.rpc('sync_offline_attendance', {
    p_scans: payload,
  })

  if (error) {
    throw new Error(error.message || 'Sync failed')
  }

  const result = data as SyncAttendanceResult

  // Mark all processed records as synced locally
  const ids = pending.map((p) => p.client_scan_id)
  await markScansSynced(ids)

  return result
}

/**
 * Fetch live event attendance records for organizers or scanner staff
 */
export async function fetchEventAttendance(eventId: string): Promise<EventAttendanceRecord[]> {
  const { data, error } = await supabase
    .from('event_attendance_records')
    .select('*, participant_profile:profiles!participant_id(*)')
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false })

  if (error) {
    console.error('Error fetching event attendance:', error)
    return []
  }

  return (data || []) as EventAttendanceRecord[]
}

