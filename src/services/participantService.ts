import { supabase } from '../lib/supabase'
import type { Application } from '../types/database'

export async function applyForEvent(params: {
  eventId: string
  teamName: string
  teamLeaderId: string
  members: Array<{ name: string; email: string }>
}): Promise<{ success: boolean; message: string; application?: Application }> {
  const { eventId, teamName, teamLeaderId, members } = params

  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (evErr || !event) {
    return { success: false, message: 'Event not found.' }
  }

  if (event.publication_status !== 'published') {
    return { success: false, message: 'Applications are only accepted for published events.' }
  }

  if (event.registration_close_at && new Date() > new Date(event.registration_close_at)) {
    return { success: false, message: 'Registration for this event has closed.' }
  }

  const totalMembers = 1 + members.length
  if (totalMembers < event.minimum_team_size || totalMembers > event.maximum_team_size) {
    return {
      success: false,
      message: `Team size must be between ${event.minimum_team_size} and ${event.maximum_team_size} members (including the team leader).`
    }
  }

  const { data: existingApp } = await supabase
    .from('applications')
    .select('id, team:teams!inner(*)')
    .eq('event_id', eventId)
    .eq('team.team_leader_id', teamLeaderId)
    .maybeSingle()

  if (existingApp) {
    return { success: false, message: 'You have already submitted an application for this event.' }
  }

  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({
      event_id: eventId,
      team_name: teamName.trim(),
      team_leader_id: teamLeaderId
    })
    .select()
    .single()

  if (teamErr) {
    if (teamErr.code === '23505') {
      return { success: false, message: 'A team with this name already exists in this hackathon.' }
    }
    throw teamErr
  }

  if (members.length > 0) {
    const memberRows = members.map(m => ({
      team_id: team.id,
      name: m.name.trim(),
      email: m.email.trim().toLowerCase(),
      invitation_status: 'pending' as const
    }))

    const { error: memErr } = await supabase.from('team_members').insert(memberRows)
    if (memErr) throw memErr
  }

  const paymentStatus = event.registration_fee > 0 ? 'pending' : 'waived'

  const { data: application, error: appErr } = await supabase
    .from('applications')
    .insert({
      event_id: eventId,
      team_id: team.id,
      application_status: 'pending',
      payment_status: paymentStatus
    })
    .select('*, team:teams(*), event:events(*)')
    .single()

  if (appErr) throw appErr

  return {
    success: true,
    message: 'Application submitted successfully!',
    application: application as Application
  }
}

export async function fetchMyApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, team:teams(*, members:team_members(*)), event:events(*, venue_request:venue_requests(*, venue:venues(*)))')
    .eq('team.team_leader_id', userId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return ((data || []) as any[]).map((app) => ({
    ...app,
    event: app.event
      ? {
          ...app.event,
          venue_request: Array.isArray(app.event.venue_request)
            ? app.event.venue_request[0] ?? null
            : app.event.venue_request,
          venue: Array.isArray(app.event.venue) ? app.event.venue[0] ?? null : app.event.venue
        }
      : null
  })) as Application[]
}

export async function fetchEventApplications(eventId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, team:teams(*, members:team_members(*))')
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ application_status: status })
    .eq('id', applicationId)

  if (error) throw error
}

export async function updatePaymentStatus(
  applicationId: string,
  status: 'pending' | 'paid' | 'waived' | 'refunded'
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ payment_status: status })
    .eq('id', applicationId)

  if (error) throw error
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ application_status: 'withdrawn' })
    .eq('id', applicationId)

  if (error) throw error
}
