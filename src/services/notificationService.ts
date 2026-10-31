import { supabase } from '../lib/supabase'
import type { Notification } from '../types/database'

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Notification[]
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read_at', null)

  if (error) throw error
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) throw error
}

export async function createNotification(params: {
  userId: string
  title: string
  message: string
  type: string
}): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    notification_type: params.type
  })
}

