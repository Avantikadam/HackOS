import { supabase } from '../lib/supabase'
import type {
  Event,
  EventRound,
  EventSponsor,
  EventArrangement,
  EventAnnouncement,
  EventFormat
} from '../types/database'

function normalizeVenueRequest(value: any): any {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function normalizeVenue(value: any): any {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export async function fetchOrganizerEvents(organizerId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*, venue_request:venue_requests(*, venue:venues(*))')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data || []) as any[]).map((event) => ({
    ...event,
    venue_request: normalizeVenueRequest(event.venue_request),
    venue: normalizeVenue(event.venue)
  })) as Event[]
}

export async function fetchEventDetails(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*, venue_request:venue_requests(*, venue:venues(*))')
    .eq('id', eventId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  const event = data as Event & { venue_request?: any }
  return {
    ...event,
    venue_request: normalizeVenueRequest(event.venue_request),
    venue: normalizeVenue(event.venue)
  } as Event
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) throw error
}

export async function createEvent(eventData: {
  organizer_id: string
  name: string
  description?: string
  detailed_description?: string
  format: EventFormat
  start_at?: string
  end_at?: string
  duration_hours?: number
  registration_fee?: number
  registration_open_at?: string
  registration_close_at?: string
  maximum_participants?: number
  maximum_teams?: number
  minimum_team_size?: number
  maximum_team_size?: number
  eligibility?: string
  rules?: string
  category?: string
}): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...eventData,
      publication_status: 'draft',
      registration_fee: eventData.registration_fee ?? 0
    })
    .select()
    .single()

  if (error) throw error
  return data as Event
}

export async function updateEvent(
  eventId: string,
  eventData: Partial<Event>
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data as Event
}

export async function publishEvent(eventId: string): Promise<{ success: boolean; message: string; event?: Event }> {
  const { error } = await supabase.rpc('publish_event', { p_event_id: eventId })

  if (error) {
    return { success: false, message: error.message }
  }

  const { data: publishedEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !publishedEvent) {
    return { success: false, message: 'Event published but could not be reloaded.' }
  }

  return { success: true, message: 'Event published successfully!', event: publishedEvent as Event }
}

export async function fetchPublishedEvents(filters?: {
  search?: string
  format?: string
  category?: string
  maxFee?: number
  verificationStatus?: string
}): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*, venue_request:venue_requests(*, venue:venues(*))')
    .eq('publication_status', 'published')
    .order('start_at', { ascending: true })

  if (filters?.format && filters.format !== 'all') {
    query = query.eq('format', filters.format)
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.verificationStatus && filters.verificationStatus !== 'all') {
    if (filters.verificationStatus === 'verified') {
      query = query.eq('verification_status', 'verified')
    } else if (filters.verificationStatus === 'unverified') {
      query = query.neq('verification_status', 'verified')
    }
  }
  if (filters?.maxFee !== undefined && filters.maxFee >= 0) {
    query = query.lte('registration_fee', filters.maxFee)
  }
  if (filters?.search && filters.search.trim()) {
    query = query.ilike('name', `%${filters.search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return ((data || []) as any[]).map((event) => ({
    ...event,
    venue_request: normalizeVenueRequest(event.venue_request),
    venue: normalizeVenue(event.venue)
  })) as Event[]
}

export async function fetchRounds(eventId: string): Promise<EventRound[]> {
  const { data, error } = await supabase
    .from('event_rounds')
    .select('*')
    .eq('event_id', eventId)
    .order('sequence_number', { ascending: true })

  if (error) throw error
  return (data || []) as EventRound[]
}

export async function saveRound(round: Partial<EventRound>): Promise<EventRound> {
  const { data, error } = await supabase
    .from('event_rounds')
    .upsert(round)
    .select()
    .single()

  if (error) throw error
  return data as EventRound
}

export async function deleteRound(roundId: string): Promise<void> {
  const { error } = await supabase.from('event_rounds').delete().eq('id', roundId)
  if (error) throw error
}

export async function fetchSponsors(eventId: string): Promise<EventSponsor[]> {
  const { data, error } = await supabase
    .from('event_sponsors')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as EventSponsor[]
}

export async function saveSponsor(sponsor: Partial<EventSponsor>): Promise<EventSponsor> {
  const { data, error } = await supabase
    .from('event_sponsors')
    .upsert(sponsor)
    .select()
    .single()

  if (error) throw error
  return data as EventSponsor
}

export async function deleteSponsor(sponsorId: string): Promise<void> {
  const { error } = await supabase.from('event_sponsors').delete().eq('id', sponsorId)
  if (error) throw error
}

export async function fetchArrangements(eventId: string): Promise<EventArrangement | null> {
  const { data, error } = await supabase
    .from('event_arrangements')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw error
  return data as EventArrangement | null
}

export async function saveArrangements(arrangements: Partial<EventArrangement>): Promise<EventArrangement> {
  const { data, error } = await supabase
    .from('event_arrangements')
    .upsert(arrangements, { onConflict: 'event_id' })
    .select()
    .single()

  if (error) throw error
  return data as EventArrangement
}

export async function fetchAnnouncements(eventId: string): Promise<EventAnnouncement[]> {
  const { data, error } = await supabase
    .from('event_announcements')
    .select('*')
    .eq('event_id', eventId)
    .order('published_at', { ascending: false })

  if (error) throw error
  return (data || []) as EventAnnouncement[]
}

export async function createAnnouncement(announcement: {
  event_id: string
  title: string
  body: string
  created_by: string
}): Promise<EventAnnouncement> {
  const { data, error } = await supabase
    .from('event_announcements')
    .insert(announcement)
    .select()
    .single()

  if (error) throw error
  return data as EventAnnouncement
}
