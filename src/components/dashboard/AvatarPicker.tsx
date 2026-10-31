import { useState } from 'react'
import { CAST, Character } from '../characters/Character'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export function AvatarPicker({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { user, profile, refreshProfile } = useAuth()
  const [selected, setSelected] = useState<string>(profile?.avatar_url || 'ada')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const characterKeys = Object.keys(CAST)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: selected, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      await refreshProfile()
      onClose()
    } catch (err) {
      console.error('Failed to update avatar:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[32rem] max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-lift">
        <div className="flex items-center justify-between border-b border-line/70 pb-4">
          <div>
            <h2 className="font-display text-[1.25rem] font-semibold text-ink">Choose your avatar</h2>
            <p className="text-[0.82rem] text-ink-muted">Select an avatar matching HACKOS character styles.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted hover:bg-parchment hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {characterKeys.map((key) => {
            const char = CAST[key]
            const isSelected = selected === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`flex flex-col items-center rounded-xl border-2 p-3 transition-all ${
                  isSelected
                    ? 'border-cobalt bg-cobalt-tint/30 shadow-soft'
                    : 'border-transparent bg-parchment/50 hover:border-line'
                }`}
              >
                <div className="flex h-20 w-16 items-end justify-center overflow-hidden">
                  <Character config={char} title={char.name} />
                </div>
                <span className="mt-2 text-[0.82rem] font-semibold text-ink">{char.name}</span>
                <span className="text-[0.7rem] text-ink-muted">{char.role}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line/70 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-white px-4 py-2 text-[0.86rem] font-medium text-ink-soft hover:bg-parchment"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-[0.86rem] font-semibold text-white hover:bg-cobalt-deep disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save avatar'}
          </button>
        </div>
      </div>
    </div>
  )
}

