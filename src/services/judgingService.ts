import { supabase } from '../lib/supabase'
import type {
  JudgingCriterion,
  JudgingScore,
  EventResult
} from '../types/database'

export async function fetchCriteria(eventId: string): Promise<JudgingCriterion[]> {
  const { data, error } = await supabase
    .from('judging_criteria')
    .select('*')
    .eq('event_id', eventId)
    .order('sequence_number', { ascending: true })

  if (error) throw error
  return (data || []) as JudgingCriterion[]
}

export async function saveCriterion(criterion: Partial<JudgingCriterion>): Promise<JudgingCriterion> {
  const { data, error } = await supabase
    .from('judging_criteria')
    .upsert(criterion)
    .select()
    .single()

  if (error) throw error
  return data as JudgingCriterion
}

export async function deleteCriterion(criterionId: string): Promise<void> {
  const { error } = await supabase.from('judging_criteria').delete().eq('id', criterionId)
  if (error) throw error
}

export async function fetchScores(eventId: string): Promise<JudgingScore[]> {
  const { data, error } = await supabase
    .from('judging_scores')
    .select('*')
    .eq('event_id', eventId)

  if (error) throw error
  return (data || []) as JudgingScore[]
}

export async function submitScore(scoreData: {
  event_id: string
  team_id: string
  criterion_id: string
  score: number
  comments?: string
  entered_by: string
}): Promise<JudgingScore> {
  const { data, error } = await supabase
    .from('judging_scores')
    .upsert(
      {
        ...scoreData,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'event_id,team_id,criterion_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as JudgingScore
}

/**
 * Validates that weights equal 100%, calculates weighted totals for each team,
 * assigns ranks, and publishes final results.
 */
export async function calculateAndPublishResults(
  eventId: string
): Promise<{ success: boolean; message: string; results?: EventResult[] }> {
  // 1. Fetch criteria and check weights sum to 100%
  const criteria = await fetchCriteria(eventId)
  if (criteria.length === 0) {
    return { success: false, message: 'Please define judging criteria before publishing results.' }
  }

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0)
  if (Math.abs(totalWeight - 100) > 0.01) {
    return {
      success: false,
      message: `Total criteria weight must equal 100%. Current total is ${totalWeight.toFixed(1)}%.`
    }
  }

  // 2. Fetch all scores for the event
  const scores = await fetchScores(eventId)

  // 3. Group by team and calculate weighted score
  const teamScoresMap: Record<string, number> = {}
  for (const score of scores) {
    const criterion = criteria.find(c => c.id === score.criterion_id)
    if (!criterion) continue
    const weighted = (Number(score.score) * Number(criterion.weight)) / 100
    teamScoresMap[score.team_id] = (teamScoresMap[score.team_id] || 0) + weighted
  }

  // Sort teams descending by score
  const sortedTeams = Object.entries(teamScoresMap).sort((a, b) => b[1] - a[1])

  if (sortedTeams.length === 0) {
    return { success: false, message: 'No team scores recorded yet to publish results.' }
  }

  const timestamp = new Date().toISOString()

  // 4. Upsert results into event_results
  const resultRows = sortedTeams.map(([teamId, totalScore], idx) => ({
    event_id: eventId,
    team_id: teamId,
    total_score: Math.round(totalScore * 100) / 100,
    rank: idx + 1,
    result_status: 'published' as const,
    published_at: timestamp
  }))

  const { data: results, error: resErr } = await supabase
    .from('event_results')
    .upsert(resultRows, { onConflict: 'event_id,team_id' })
    .select('*, team:teams(*)')

  if (resErr) throw resErr

  return {
    success: true,
    message: 'Results calculated and published successfully!',
    results: (results || []) as EventResult[]
  }
}

export async function fetchPublishedResults(eventId: string): Promise<EventResult[]> {
  const { data, error } = await supabase
    .from('event_results')
    .select('*, team:teams(*)')
    .eq('event_id', eventId)
    .eq('result_status', 'published')
    .order('rank', { ascending: true })

  if (error) throw error
  return (data || []) as EventResult[]
}

