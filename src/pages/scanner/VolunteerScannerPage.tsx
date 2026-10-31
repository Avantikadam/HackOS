import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchPublishedEvents } from '../../services/eventService'
import {
  recordCheckInScan,
  syncPendingScans,
  fetchEventAttendance,
} from '../../services/checkinService'
import {
  getAllOfflineScans,
  countPendingScans,
  type PendingScan,
} from '../../utils/offlineStore'
import type { Event, EventAttendanceRecord } from '../../types/database'

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M19 14.5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3l1.5-2h5l1.5 2h3a2 2 0 0 1 2 2v7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="11" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function SyncIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}>
      <path d="M17.5 10A7.5 7.5 0 1 1 15 4.7l2.5-.2M17.5 1v4.5H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SCANNER_NAV = [
  { label: 'Gate Scanner', href: '/scanner', icon: <CameraIcon /> },
]

export function VolunteerScannerPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [inputToken, setInputToken] = useState('')
  const [processing, setProcessing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [offlineScans, setOfflineScans] = useState<PendingScan[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<EventAttendanceRecord[]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    loadEvents()

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      refreshData()
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    try {
      const data = await fetchPublishedEvents()
      setEvents(data)
      if (data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load published events:', err)
    }
  }

  const refreshData = async () => {
    if (!selectedEventId) return
    const [pending, allScans, att] = await Promise.all([
      countPendingScans(selectedEventId),
      getAllOfflineScans(selectedEventId),
      fetchEventAttendance(selectedEventId),
    ])
    setPendingCount(pending)
    setOfflineScans(allScans)
    setAttendanceRecords(att)
  }

  // Camera barcode detection loop
  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)

      // Check BarcodeDetector API
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const detectedValue = barcodes[0].rawValue
              if (detectedValue && detectedValue.startsWith('HQRP_')) {
                stopCamera()
                await processToken(detectedValue)
              }
            }
          } catch {
            // Frame skip
          }
        }, 300)
      }
    } catch (err: any) {
      setCameraError(err?.message || 'Camera permission denied or camera not found.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const processToken = async (token: string) => {
    if (!token.trim() || !selectedEventId) return
    setProcessing(true)
    setScanResult(null)

    try {
      const res = await recordCheckInScan(selectedEventId, token.trim())

      if (res.synced && res.result) {
        if (res.result.duplicate_count > 0) {
          setScanResult({
            type: 'warning',
            message: `Pass already checked in: "${token}". Duplicate skipped.`,
          })
        } else if (res.result.synced_count > 0) {
          setScanResult({
            type: 'success',
            message: `✓ Participant checked in successfully: "${token}".`,
          })
        } else {
          setScanResult({
            type: 'error',
            message: `Invalid or unassigned pass token: "${token}".`,
          })
        }
      } else {
        setScanResult({
          type: 'warning',
          message: `Saved offline to IndexedDB queue. Scan ID: ${res.client_scan_id}.`,
        })
      }

      setInputToken('')
      await refreshData()
    } catch (err: any) {
      setScanResult({
        type: 'error',
        message: err?.message || 'Check-in failed.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault()
    await processToken(inputToken)
  }

  const handleManualSync = async () => {
    if (!selectedEventId) return
    setSyncing(true)
    setScanResult(null)
    try {
      const res = await syncPendingScans(selectedEventId)
      setScanResult({
        type: 'success',
        message: `Sync complete! Synced: ${res.synced_count}, Duplicates: ${res.duplicate_count}, Errors: ${res.error_count}`,
      })
      await refreshData()
    } catch (err: any) {
      setScanResult({
        type: 'error',
        message: err?.message || 'Sync failed. Will retry automatically when online.',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <DashboardLayout navItems={SCANNER_NAV} roleLabel="Gate Scanner Volunteer" roleColor="cobalt">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
                Gate Check-In Terminal
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
                  isOnline
                    ? 'bg-sage-tint text-sage-ink border border-sage/30'
                    : 'bg-amber-tint text-[#8a5a10] border border-amber/30'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-sage' : 'bg-amber'}`} />
                {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
              </span>
            </div>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Participant QR Scanner
            </h1>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing || pendingCount === 0 || !isOnline}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition ${
              pendingCount > 0
                ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
                : 'bg-white text-ink-muted border border-line hover:bg-parchment'
            } disabled:opacity-50`}
          >
            <SyncIcon spinning={syncing} />
            {syncing
              ? 'Syncing Scans...'
              : pendingCount > 0
              ? `SYNC ${pendingCount} OFFLINE SCANS`
              : 'ALL SCANS SYNCED'}
          </button>
        </div>

        {/* Event Selector */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Target Hackathon Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-ink focus:border-cobalt focus:outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.format})
              </option>
            ))}
          </select>
        </div>

        {/* Feedback alert */}
        {scanResult && (
          <div
            className={`rounded-2xl border p-4 text-sm font-semibold flex items-center gap-3 ${
              scanResult.type === 'success'
                ? 'border-sage/40 bg-sage-tint/60 text-sage-ink'
                : scanResult.type === 'warning'
                ? 'border-amber/40 bg-amber-tint/60 text-[#8a5a10]'
                : 'border-coral/40 bg-coral-tint/60 text-coral'
            }`}
          >
            <span className="text-lg">
              {scanResult.type === 'success' ? '✓' : scanResult.type === 'warning' ? '⚠️' : '✕'}
            </span>
            <p>{scanResult.message}</p>
          </div>
        )}

        {/* Scanner Panel */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Camera Scanner Box */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-ink">
                  Camera QR Reader
                </h3>
                {cameraActive && (
                  <span className="rounded-full bg-coral-tint px-2 py-0.5 text-[0.7rem] font-bold text-coral animate-pulse">
                    LIVE CAMERA
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Scan attendee QR badge directly via phone or laptop webcam.
              </p>

              <div className="mt-4 relative aspect-video overflow-hidden rounded-xl border-2 border-dashed border-line bg-black/90 flex items-center justify-center">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-white/60">
                    <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
                      <CameraIcon />
                    </div>
                    <p className="mt-2 text-xs font-semibold">Camera is stopped</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="mt-2 text-xs font-semibold text-coral">
                  {cameraError}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-line">
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink-soft hover:bg-parchment transition"
                >
                  Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full rounded-xl bg-cobalt py-2.5 text-xs font-semibold text-white hover:bg-cobalt-hover transition"
                >
                  Start Camera Scanner
                </button>
              )}
            </div>
          </div>

          {/* Manual Token Entry Box */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-soft flex flex-col justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-ink">
                Manual Token Entry
              </h3>
              <p className="mt-1 text-xs text-ink-muted">
                Type or paste the attendee's opaque gate token if camera is unavailable.
              </p>

              <form onSubmit={handleManualScan} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Gate Token (HQRP_...)
                  </label>
                  <input
                    type="text"
                    required
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value.trim())}
                    placeholder="HQRP_940d9904d9..."
                    className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 font-mono text-sm text-ink focus:border-cobalt focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || inputToken.length < 8}
                  className="w-full rounded-xl bg-ink py-2.5 text-xs font-semibold text-white hover:bg-ink-soft disabled:opacity-50 transition"
                >
                  {processing ? 'Recording Check-In...' : 'Record Check-In'}
                </button>
              </form>
            </div>

            <div className="mt-4 rounded-xl bg-parchment/60 p-3 text-[0.74rem] text-ink-muted space-y-1">
              <p className="font-bold text-ink">⚡ Offline-First Architecture:</p>
              <p>
                Every scan is written instantly to local IndexedDB storage before any network request is sent. If connection drops, attendees are never blocked.
              </p>
            </div>
          </div>
        </div>

        {/* Live Attendance & Scans Feed */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="font-heading text-base font-bold text-ink">
                Gate Activity Feed
              </h3>
              <p className="text-xs text-ink-muted">
                Total Check-Ins: <strong className="text-ink">{attendanceRecords.length}</strong> · Pending Sync: <strong className="text-amber-600">{pendingCount}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              className="text-xs font-semibold text-cobalt hover:underline"
            >
              Refresh Feed
            </button>
          </div>

          <div className="mt-4 divide-y divide-line/60 max-h-72 overflow-y-auto">
            {attendanceRecords.length === 0 && offlineScans.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-muted">
                No check-ins recorded yet for this event.
              </p>
            ) : (
              attendanceRecords.map((rec) => (
                <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-sage-tint text-sage font-bold text-[0.65rem]">
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold text-ink">
                        {rec.participant_profile?.full_name || 'Verified Participant'}
                      </p>
                      <p className="text-[0.7rem] text-ink-muted font-mono truncate max-w-[200px]">
                        Scan ID: {rec.client_scan_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-sage-tint px-2 py-0.5 text-[0.68rem] font-bold text-sage-ink">
                      CHECKED IN
                    </span>
                    <p className="text-[0.7rem] text-ink-muted mt-0.5">
                      {new Date(rec.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
