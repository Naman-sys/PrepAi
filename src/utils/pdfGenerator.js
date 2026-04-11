import { jsPDF } from 'jspdf'

export function generateSessionPdf(sessionData) {
  const doc = new jsPDF()

  const marginX = 18
  const pageHeight = 297
  const contentWidth = 210 - marginX * 2
  const bottomSafeY = pageHeight - 18
  let y = 20

  const date = new Date(sessionData?.date || Date.now()).toLocaleString()
  const overall = Number(sessionData?.overallScore || 0).toFixed(1)
  const verbalOverallBase = sessionData?.verbalOverallScore ?? sessionData?.overallScore ?? 0
  const verbalOverall = Number(verbalOverallBase).toFixed(1)
  const codingOverall = Number(sessionData?.codingOverallScore || 0).toFixed(1)

  const ensureSpace = (neededHeight = 10) => {
    if (y + neededHeight <= bottomSafeY) return
    doc.addPage()
    y = 20
  }

  const sectionTitle = (title) => {
    ensureSpace(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(title, marginX, y)
    y += 2
    doc.setDrawColor(225, 225, 225)
    doc.line(marginX, y + 1, marginX + contentWidth, y + 1)
    y += 8
  }

  const writeWrapped = (text, size = 10, style = 'normal', lineGap = 5) => {
    const safe = String(text || '')
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(safe, contentWidth)
    ensureSpace(lines.length * lineGap + 2)
    doc.text(lines, marginX, y)
    y += lines.length * lineGap + 2
  }

  const writePair = (label, value) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const labelText = `${label}:`
    doc.text(labelText, marginX, y)
    const labelWidth = doc.getTextWidth(labelText) + 2
    doc.setFont('helvetica', 'normal')
    const wrappedValue = doc.splitTextToSize(String(value || 'N/A'), contentWidth - labelWidth)
    ensureSpace(wrappedValue.length * 5 + 2)
    doc.text(wrappedValue, marginX + labelWidth, y)
    y += wrappedValue.length * 5 + 2
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('PrepAI Evaluation Report', marginX, y)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  doc.text(`Generated: ${date}`, marginX, y)
  doc.setTextColor(0, 0, 0)
  y += 8

  sectionTitle('Session Overview')
  writePair('Domain', sessionData?.domain || 'N/A')
  writePair('Difficulty', sessionData?.difficulty || 'N/A')
  writePair('Overall Score', `${overall} / 10`)
  writePair('Verbal Score', `${verbalOverall} / 10`)
  if (Number.isFinite(sessionData?.codingOverallScore)) {
    writePair('Coding Score', `${codingOverall} / 10`)
  }

  sectionTitle('Key Metrics')
  writePair('Eye Contact', `${Math.round(sessionData?.eyeContact || 0)}%`)
  writePair('Average WPM', `${Math.round(sessionData?.averageWpm || 0)}`)
  writePair('Total Fillers', `${sessionData?.totalFillers || 0}`)

  const questions = sessionData?.questionBreakdown || []
  sectionTitle('Verbal Question Breakdown')
  if (!questions.length) {
    writeWrapped('No verbal question scores available.', 10, 'normal')
  } else {
    questions.forEach((item, index) => {
      ensureSpace(12)
      const line = `Q${index + 1} | overall ${Number(item?.overall || 0).toFixed(1)} | relevance ${Number(item?.relevance || 0).toFixed(1)} | clarity ${Number(item?.clarity || 0).toFixed(1)} | depth ${Number(item?.depth || 0).toFixed(1)} | confidence ${Number(item?.confidence || 0).toFixed(1)}`
      writeWrapped(line, 10, 'normal')
    })
  }

  const coding = sessionData?.codingBreakdown || []
  if (coding.length) {
    sectionTitle('Coding Round Breakdown')
    coding.forEach((item, index) => {
      ensureSpace(20)
      const score = Number(item?.score?.overall || 0).toFixed(1)
      const skipped = item?.skipped ? ' (Skipped)' : ''
      writeWrapped(`C${index + 1}: ${item?.title || 'Coding Question'}${skipped}`, 10, 'bold')
      writeWrapped(`Score: ${score} / 10`, 10, 'normal')
      writeWrapped(`Feedback: ${item?.score?.feedback || 'No feedback available.'}`, 10, 'normal')
      y += 1
    })
  }

  sectionTitle('Improvement Summary')
  writeWrapped(`Verbal: ${sessionData?.summary || 'No summary available.'}`, 10, 'normal')
  if (sessionData?.codingSummary) {
    writeWrapped(`Coding: ${sessionData.codingSummary}`, 10, 'normal')
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Page ${i} of ${pages}`, 210 - marginX - 24, pageHeight - 8)
    doc.setTextColor(0, 0, 0)
  }

  doc.save(`prepai-report-${Date.now()}.pdf`)
}
