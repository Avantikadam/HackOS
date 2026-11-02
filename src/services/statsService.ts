import { supabase } from '../lib/supabase'
import { fetchOrganizerEvents, fetchPublishedEvents } from './eventService'
import { fetchMyApplications } from './participantService'
import { fetchIncomingRequests, fetchVenuesByOwner } from './venueService'
import type { Application, VenueRequest } from '../types/database'

export interface OrganizerStats {
  totalEvents: number
  publishedCount: number
  draftCount: number
  pendingVenueRequests: number
  upcomingEvents: number
  totalApplications: number
  pendingApplications: number
  acceptedApplications: number
  rejectedApplications: number
  totalTeams: number
  acceptedTeams: number
}

export interface ParticipantStats {
  publishedEvents: number
  myApplications: number
  pendingApplications: number
  acceptedApplications: number
  rejectedApplications: number
  myTeams: number
  completedEvents: number
}

export interface VenueStats {
  totalVenues: number
  incomingRequests: number
  pendingRequests: number
  quotedRequests: number
  acceptedRequests: number
  rejectedRequests: number
}

export async function fetchOrganizerStats(userId: string): Promise<OrganizerStats> {
  const events = await fetchOrganizerEvents(userId)
  const eventIds = events.map((event) => event.id)

  let applications: Application[] = []
  let teams: Array<{ id: string; event_id: string }> = []
  let requestsData: VenueRequest[] = []

  if (eventIds.length) {
    const [applicationsResult, teamsResult] = await Promise.all([
      supabase
        .from('applications')
        .select('id, application_status, team_id, event_id')
        .in('event_id', eventIds),
      supabase
        .from('teams')
        .select('id, event_id')
        .in('event_id', eventIds)
    ])

    if (applicationsResult.error) throw applicationsResult.error
    if (teamsResult.error) throw teamsResult.error

    applications = (applicationsResult.data || []) as Application[]
    teams = (teamsResult.data || []) as Array<{ id: string; event_id: string }>
  }

  const requestsResult = await supabase
    .from('venue_requests')
    .select('id, request_status')
    .eq('organizer_id', userId)

  if (requestsResult.error) throw requestsResult.error
  requestsData = (requestsResult.data || []) as VenueRequest[]

  const acceptedTeamIds = new Set(
    applications
      .filter((app) => app.application_status === 'accepted' && app.team_id)
      .map((app) => app.team_id as string)
  )

  const now = new Date()
  const upcomingEvents = events.filter(
    (event) => event.start_at && new Date(event.start_at) > now && event.publication_status !== 'draft'
  ).length

  return {
    totalEvents: events.length,
    publishedCount: events.filter((event) => event.publication_status === 'published').length,
    draftCount: events.filter((event) => event.publication_status === 'draft').length,
    pendingVenueRequests: requestsData.filter((request) => request.request_status === 'pending').length,
    upcomingEvents,
    totalApplications: applications.length,
    pendingApplications: applications.filter((app) => app.application_status === 'pending').length,
    acceptedApplications: applications.filter((app) => app.application_status === 'accepted').length,
    rejectedApplications: applications.filter((app) => app.application_status === 'rejected').length,
    totalTeams: teams.length,
    acceptedTeams: acceptedTeamIds.size
  }
}

export async function fetchParticipantStats(userId: string): Promise<ParticipantStats> {
  const [publishedEvents, myApplications] = await Promise.all([
    fetchPublishedEvents(),
    fetchMyApplications(userId)
  ])

  const now = new Date()
  const myTeams = new Set(
    myApplications
      .map((app) => app.team_id)
      .filter((teamId): teamId is string => Boolean(teamId))
  ).size

  return {
    publishedEvents: publishedEvents.length,
    myApplications: myApplications.length,
    pendingApplications: myApplications.filter((app) => app.application_status === 'pending').length,
    acceptedApplications: myApplications.filter((app) => app.application_status === 'accepted').length,
    rejectedApplications: myApplications.filter((app) => app.application_status === 'rejected').length,
    myTeams,
    completedEvents: myApplications.filter(
      (app) => app.event?.end_at && new Date(app.event.end_at) < now && app.application_status === 'accepted'
    ).length
  }
}

export async function fetchVenueStats(userId: string): Promise<VenueStats> {
  const venues = await fetchVenuesByOwner(userId)
  const requests = await fetchIncomingRequests(undefined)
  const venueIds = venues.map((venue: { id: string }) => venue.id)

  const ownedRequests = venueIds.length
    ? requests.filter((request) => venueIds.includes(request.venue_id))
    : requests

  const statusCounts = ownedRequests.reduce<Record<string, number>>((acc, request) => {
    acc[request.request_status] = (acc[request.request_status] || 0) + 1
    return acc
  }, {})

  return {
    totalVenues: venues.length,
    incomingRequests: ownedRequests.length,
    pendingRequests: statusCounts['pending'] || 0,
    quotedRequests: statusCounts['quoted'] || 0,
    acceptedRequests: statusCounts['accepted'] || 0,
    rejectedRequests: statusCounts['rejected'] || 0
  }
}
