import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface ScannableQrCodeProps {
  value: string
  size?: number
  className?: string
}

export function ScannableQrCode({ value, size = 220, className = '' }: ScannableQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!value) return
    QRCode.toDataURL(value, {
      width: size,
      margin: 1.5,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setDataUrl(url)
        setError(null)
      })
      .catch((err) => {
        console.error('QR code generation error:', err)
        setError('Failed to render QR')
      })
  }, [value, size])

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-2xl border border-line bg-parchment/60 text-xs text-ink-muted ${className}`}
      >
        {error}
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-2xl border border-line bg-white shadow-soft ${className}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-cobalt" />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-line/80 bg-white p-3 shadow-soft inline-block ${className}`}>
      <img
        src={dataUrl}
        alt={`Participant Check-in QR: ${value}`}
        width={size}
        height={size}
        className="block rounded-lg"
      />
    </div>
  )
}

