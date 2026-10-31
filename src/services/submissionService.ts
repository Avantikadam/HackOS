import { supabase } from '../lib/supabase'
import type {
  ProjectSubmission,
  JudgingCriterion,
  EventResult,
  EvaluationSubmissionPayload,
  Event,
} from '../types/database'

/**
 * Fetch project submission for a specific team
 */
export async function fetchTeamSubmission(teamId: string): Promise<ProjectSubmission | null> {
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*, team:teams(*), event:events(*)')
    .eq('team_id', teamId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching team submission:', error)
    return null
  }

  return data as ProjectSubmission | null
}

/**
 * Fetch all project submissions for an event
 */
export async function fetchEventSubmissions(eventId: string): Promise<ProjectSubmission[]> {
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*, team:teams(*)')
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching event submissions:', error)
    return []
  }

  return (data || []) as ProjectSubmission[]
}

/**
 * Upload presentation PDF (up to 25MB) to private storage bucket
 */
export async function uploadPresentationPdf(
  eventId: string,
  teamId: string,
  file: File
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('Presentation must be a valid PDF document.')
  }

  const MAX_SIZE = 26214400 // 25 MB
  if (file.size > MAX_SIZE) {
    throw new Error('PDF file size must not exceed 25MB.')
  }

  const filePath = `${eventId}/${teamId}/${Date.now()}_presentation.pdf`

  const { error } = await supabase.storage
    .from('project-presentations')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    throw new Error(error.message || 'Failed to upload presentation slides.')
  }

  return filePath
}

/**
 * Generate temporary signed URL for presentation PDF
 */
export async function getSignedPresentationUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('project-presentations')
    .createSignedUrl(storagePath, 3600)

  if (error) {
    console.error('Error creating signed presentation url:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Submit or update team project submission
 */
export async function submitProject(payload: {
  eventId: string
  teamId: string
  title: string
  description: string
  githubUrl: string
  demoUrl?: string
  presentationPath?: string
}): Promise<ProjectSubmission> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Authentication required')

  // Basic URL validation
  let gh = payload.githubUrl.trim()
  if (!gh.startsWith('http://') && !gh.startsWith('https://')) {
    gh = 'https://' + gh
  }

  const { data, error } = await supabase
    .from('project_submissions')
    .upsert(
      {
        event_id: payload.eventId,
        team_id: payload.teamId,
        submitted_by: userData.user.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        github_url: gh,
        demo_url: payload.demoUrl?.trim() || null,
        presentation_storage_path: payload.presentationPath || null,
        submission_status: 'submitted',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,version' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to save project submission.')
  }

  return data as ProjectSubmission
}

/**
 * Fetch judging criteria for an event
 */
export async function fetchEventCriteria(eventId: string): Promise<JudgingCriterion[]> {
  const { data, error } = await supabase
    .from('judging_criteria')
    .select('*')
    .eq('event_id', eventId)
    .order('sequence_number', { ascending: true })

  if (error) {
    console.error('Error fetching criteria:', error)
    return []
  }

  return (data || []) as JudgingCriterion[]
}

/**
 * Submit judge evaluation using atomic Postgres RPC
 */
export async function submitJudgeEvaluation(
  payload: EvaluationSubmissionPayload
): Promise<{ success: boolean; weighted_score: number; message: string }> {
  const { data, error } = await supabase.rpc('submit_judge_evaluation', {
    p_event_id: payload.event_id,
    p_team_id: payload.team_id,
    p_scores: payload.scores,
    p_general_comments: payload.general_comments || null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to submit evaluation.')
  }

  return data as { success: boolean; weighted_score: number; message: string }
}

/**
 * Publish final leaderboard for an event
 */
export async function publishEventLeaderboard(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('publish_leaderboard', {
    p_event_id: eventId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to publish leaderboard.')
  }
}

/**
 * Fetch events assigned to a judge
 */
export async function fetchJudgeAssignedEvents(judgeId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('judge_assignments')
    .select('event:events(*)')
    .eq('judge_id', judgeId)

  if (error) {
    console.error('Error fetching judge assigned events:', error)
    return []
  }

  return (data || []).map((row: any) => row.event).filter(Boolean) as Event[]
}

/**
 * Fetch live or published event results / leaderboard
 */
export async function fetchEventLeaderboard(eventId: string): Promise<EventResult[]> {
  const { data, error } = await supabase
    .from('event_results')
    .select('*, team:teams(*)')
    .eq('event_id', eventId)
    .order('rank', { ascending: true })

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }

  return (data || []) as EventResult[]
}

