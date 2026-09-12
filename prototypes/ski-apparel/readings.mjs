/**
 * Folding broadcast batches into what the rail shows.
 *
 * Pure, and run in the browser. The input is exactly what
 * `broadcastReaderSignals` dispatches — nothing here knows how a signal was
 * gathered — and the legend turns node ids into names.
 */

const FEED_LENGTH = 16

export const emptyReadings = () => ({ dwell: {}, viewed: {}, jumps: {}, opened: {}, feed: [], batches: 0, signals: 0 })

const bump = (counts, key, by = 1) => ({ ...counts, [key]: (counts[key] ?? 0) + by })

const sectionLabel = (legend, nodeId) => legend.sections.find((section) => section.nodeId === nodeId)?.label

const labelFor = (legend, anchor) => legend.sections.find((section) => section.anchor === anchor)?.label ?? anchor

/** One line for the feed, or `undefined` for a signal too routine to list. Dwell is shown as totals, not lines. */
const lineFor = (signal, legend) => {
  if (signal.kind === "viewed") {
    const label = sectionLabel(legend, signal.nodeId)
    return label === undefined ? undefined : { kind: "viewed", subject: label }
  }

  if (signal.kind === "activated") {
    const anchor = legend.jumps[signal.nodeId]
    return { kind: "activated", subject: anchor ? `${signal.type} → ${labelFor(legend, anchor)}` : signal.type }
  }

  if (signal.kind === "disclosed") {
    const question = legend.questions[signal.nodeId] ?? signal.nodeId
    return { kind: signal.open ? "opened" : "closed", subject: question }
  }

  return undefined
}

const foldSignal = (readings, signal, legend) => {
  const anchor = signal.kind === "activated" ? legend.jumps[signal.nodeId] : undefined

  return {
    ...readings,
    dwell: signal.kind === "dwelled" ? bump(readings.dwell, signal.nodeId, signal.ms) : readings.dwell,
    viewed: signal.kind === "viewed" ? { ...readings.viewed, [signal.nodeId]: true } : readings.viewed,
    jumps: anchor === undefined ? readings.jumps : bump(readings.jumps, anchor),
    opened:
      signal.kind === "disclosed" && signal.open ? bump(readings.opened, signal.nodeId) : readings.opened,
  }
}

export const fold = (readings, batch, legend) => {
  const folded = batch.signals.reduce((next, signal) => foldSignal(next, signal, legend), readings)

  const lines = batch.signals
    .map((signal) => lineFor(signal, legend))
    .filter((line) => line !== undefined)
    .map((line) => ({ ...line, at: batch.sentAt }))

  const header = { kind: "batch", at: batch.sentAt, subject: `rev ${batch.revision} · ${batch.signals.length} signals` }

  return {
    ...folded,
    batches: readings.batches + 1,
    signals: readings.signals + batch.signals.length,
    feed: [...lines.reverse(), header, ...readings.feed].slice(0, FEED_LENGTH),
  }
}

/** Time on screen and jumps per section, in the order the page has them. */
export const summarise = (readings, legend) =>
  legend.sections.map((section) => ({
    label: section.label,
    seconds: Math.round((readings.dwell[section.nodeId] ?? 0) / 100) / 10,
    jumps: readings.jumps[section.anchor] ?? 0,
    reached: readings.viewed[section.nodeId] === true,
  }))

export const questionsOpened = (readings, legend) =>
  Object.entries(readings.opened)
    .map(([nodeId, count]) => ({ question: legend.questions[nodeId] ?? nodeId, count }))
    .sort((first, second) => second.count - first.count)
