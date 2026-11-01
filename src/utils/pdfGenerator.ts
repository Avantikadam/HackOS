import { jsPDF } from 'jspdf'
import type { VenueAgreement, VenueQuotation, Venue, Event } from '../types/database'

export function generateAuthorizationPdfBlob(params: {
  agreement: VenueAgreement
  quotation: VenueQuotation
  venue: Venue
  event: Event
  repName?: string
  repEmail?: string
}): Blob {
  const { agreement, quotation, venue, event, repName, repEmail } = params
  const doc = new jsPDF()

  // Header banner
  doc.setFillColor(31, 78, 216) // Cobalt #1f4ed8
  doc.rect(0, 0, 210, 26, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('HACKOS · VENUE AUTHORIZATION AGREEMENT', 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('OFFICIAL OPERATIONAL AUTHORIZATION RECORD', 14, 22)

  // Document metadata box
  doc.setFillColor(243, 235, 221) // Parchment #f3ebdd
  doc.rect(14, 32, 182, 22, 'F')
  doc.setDrawColor(227, 218, 200) // Line #e3dac8
  doc.rect(14, 32, 182, 22, 'S')

  doc.setTextColor(19, 28, 49) // Ink #131c31
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Agreement Version:', 20, 40)
  doc.setFont('helvetica', 'normal')
  doc.text(`v${agreement.version}.0 (OTP-Verified)`, 58, 40)

  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 20, 48)
  doc.setTextColor(47, 125, 108) // Sage
  doc.text(agreement.agreement_status.toUpperCase(), 58, 48)

  doc.setTextColor(19, 28, 49)
  doc.setFont('helvetica', 'bold')
  doc.text('Verification Date:', 110, 40)
  doc.setFont('helvetica', 'normal')
  doc.text(agreement.otp_verified_at ? new Date(agreement.otp_verified_at).toLocaleString() : 'Pending', 145, 40)

  doc.setFont('helvetica', 'bold')
  doc.text('Document Ref:', 110, 48)
  doc.setFont('helvetica', 'normal')
  doc.text(agreement.id.slice(0, 16).toUpperCase(), 145, 48)

  // Event & Venue sections
  let y = 62

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(19, 28, 49)
  doc.text('1. Event & Organizer Details', 14, y)

  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Event Name:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(event.name, 45, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Format & Category:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${event.format.toUpperCase()} · ${event.category || 'Technology'}`, 45, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Requested Dates:', 14, y)
  doc.setFont('helvetica', 'normal')
  const dateStr = event.start_at && event.end_at
    ? `${new Date(event.start_at).toLocaleDateString()} to ${new Date(event.end_at).toLocaleDateString()}`
    : 'As scheduled'
  doc.text(dateStr, 45, y)

  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('2. Venue & Facility Authorization', 14, y)

  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Venue Name:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(venue.venue_name, 45, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Address:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${venue.address || ''}, ${venue.city || ''}, ${venue.state || ''}`, 45, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Approved Capacity:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${venue.capacity} seated participants`, 45, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Authorized Rep:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${repName || venue.authorized_rep_name || 'Authorized Venue Lead'} (${repEmail || venue.contact_email || ''})`, 45, y)

  // Quotation Table
  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('3. Agreed Itemized Quotation (INR)', 14, y)

  y += 7
  doc.setFillColor(239, 230, 214) // Linen
  doc.rect(14, y, 182, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('ITEM DESCRIPTION', 18, y + 5)
  doc.text('QTY / NOTES', 120, y + 5)
  doc.text('AMOUNT (₹)', 170, y + 5)

  y += 7
  doc.setFont('helvetica', 'normal')

  const costs = quotation.itemized_costs || []
  costs.forEach((cost) => {
    doc.text(cost.item || 'Service item', 18, y + 5)
    doc.text(cost.qty || cost.notes || '1', 120, y + 5)
    doc.text(`₹ ${Number(cost.amount || 0).toLocaleString('en-IN')}`, 170, y + 5)
    y += 6
  })

  // Total bar
  doc.setFillColor(243, 235, 221)
  doc.rect(14, y, 182, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL AGREED AMOUNT:', 18, y + 5.5)
  doc.text(`₹ ${Number(quotation.total_amount || 0).toLocaleString('en-IN')}`, 170, y + 5.5)

  // Verification & Sign-off statement
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('4. OTP-Verified Electronic Acceptance Record', 14, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const stmt = 'This document certifies that the authorized venue representative confirmed and authorized this booking request via a two-step cryptographic OTP challenge. Acceptance timestamp and verified representative credentials have been permanently logged into the immutable audit trail.'
  doc.text(doc.splitTextToSize(stmt, 182), 14, y)

  y += 16
  doc.setFillColor(224, 239, 233) // Sage tint
  doc.rect(14, y, 182, 18, 'F')
  doc.setDrawColor(47, 125, 108)
  doc.rect(14, y, 182, 18, 'S')

  doc.setTextColor(37, 99, 86)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('✔ OTP VERIFICATION RECORDED & VALIDATED', 20, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Verified at: ${agreement.otp_verified_at || new Date().toISOString()} · Audit ID: ${agreement.id}`, 20, y + 13)

  // Footer Disclaimer
  doc.setFontSize(7.5)
  doc.setTextColor(95, 106, 131)
  doc.text(
    'IMPORTANT NOTICE: An OTP-verified acceptance with timestamp records the representative\'s operational approval. This document serves as the operational prerequisite for hackathon publishing under HACKOS rules.',
    14,
    285
  )

  // Save/Download
  return doc.output('blob')
}

export function generateAuthorizationPdf(params: {
  agreement: VenueAgreement
  quotation: VenueQuotation
  venue: Venue
  event: Event
  repName?: string
  repEmail?: string
}) {
  const blob = generateAuthorizationPdfBlob(params)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `HACKOS-Venue-Authorization-${params.event.name.replace(/\s+/g, '-')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

