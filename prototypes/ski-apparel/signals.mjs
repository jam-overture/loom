/**
 * What the page noticed about being read, and what it concludes from that.
 *
 * Two things kept deliberately apart. **Readings** are observations — this
 * section was on screen this long, this link was clicked twice — and they are
 * never opinions. **A derivation** turns readings into one sentence a person
 * could argue with, and it is the only place a judgement is made.
 *
 * The split matters because the sentence is what reaches the runtime as an
 * intent, and an intent is the thing a reviewer reads later. "Readers open this
 * question more than any other" can be checked against the numbers. "Open the
 * question" cannot.
 *
 * Everything here is pure. The server holds the readings; this file decides
 * nothing about where they live.
 */

/** A section, as the page's own `anchor` props name it, in the order they appear. */
export const SECTION_ORDER = ["top", "layers", "helmets", "goggles", "fit"]

export const SECTION_LABELS = {
  top: "the opening",
  layers: "shell construction",
  helmets: "helmets",
  goggles: "goggles",
  fit: "the questions",
}

export const emptyReadings = () => ({ dwell: {}, reached: {}, navClicks: {}, faqClicks: {}, events: 0 })

const bump = (counts, key) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 })

/**
 * One observation, folded in.
 *
 * `dwell` accumulates rather than replaces because a reader who scrolls back is
 * telling you something a last-write-wins counter would throw away. Clicks are
 * counted for the same reason: the second click on the same thing is the signal,
 * not the first.
 */
export const record = (readings, event) => {
  if (event.kind === "dwell" && SECTION_ORDER.includes(event.section)) {
    return {
      ...readings,
      events: readings.events + 1,
      reached: { ...readings.reached, [event.section]: true },
      dwell: { ...readings.dwell, [event.section]: (readings.dwell[event.section] ?? 0) + event.ms },
    }
  }

  if (event.kind === "nav-click" && SECTION_ORDER.includes(event.section)) {
    return { ...readings, events: readings.events + 1, navClicks: bump(readings.navClicks, event.section) }
  }

  if (event.kind === "faq-click" && typeof event.question === "string" && event.question.length > 0) {
    return { ...readings, events: readings.events + 1, faqClicks: bump(readings.faqClicks, event.question) }
  }

  return readings
}

/** Dwell per section in seconds, in page order, with the sections never reached at zero. */
export const summarise = (readings) =>
  SECTION_ORDER.map((section, index) => ({
    section,
    label: SECTION_LABELS[section],
    index,
    seconds: Math.round((readings.dwell[section] ?? 0) / 100) / 10,
    clicks: readings.navClicks[section] ?? 0,
    reached: readings.reached[section] === true,
  }))

/** Every question a reader has opened, most-opened first. */
export const questionsOpened = (readings) =>
  Object.entries(readings.faqClicks)
    .map(([question, count]) => ({ question, count }))
    .sort((first, second) => second.count - first.count)

const ENOUGH = { sections: 2, seconds: 8, faqClicks: 2 }

/**
 * The two conclusions this page knows how to draw.
 *
 * They are ordered by how cheap they are to be wrong about, and that ordering is
 * doing real work: opening a question a reader already opened twice costs
 * nothing if it is wrong, and reordering the page costs a reader their place. So
 * the small one is offered first, and the Gate — not this function — is what
 * decides whether either may land unattended.
 *
 * Returns `undefined` when the readings support neither, which is most of the
 * time and is the correct answer. A signal source that always has a suggestion
 * is not observing anything.
 */
export const derive = (readings, { skip = [] } = {}) => {
  const wanted = questionsOpened(readings).find(
    (row) => row.count >= ENOUGH.faqClicks && !skip.includes(`faq:${row.question}`)
  )

  if (wanted !== undefined) {
    return {
      id: `faq:${wanted.question}`,
      kind: "open-faq",
      question: wanted.question,
      count: wanted.count,
      utterance:
        `Readers opened "${wanted.question}" ${wanted.count} times — more than any other question. ` +
        `Have it open when the page loads.`,
    }
  }

  const rows = summarise(readings).filter((row) => row.reached && row.seconds > 0)
  const total = rows.reduce((sum, row) => sum + row.seconds, 0)

  if (rows.length < ENOUGH.sections || total < ENOUGH.seconds) return undefined

  /** Attention is time plus deliberate returns. A nav click is worth five seconds. */
  const weighted = rows.map((row) => ({ ...row, weight: row.seconds + row.clicks * 5 }))
  const longest = weighted.reduce((best, row) => (row.weight > best.weight ? row : best))
  const midpoint = Math.floor(SECTION_ORDER.length / 2)

  if (longest.index <= midpoint || longest.section === "top") return undefined
  if (skip.includes(`move:${longest.section}`)) return undefined

  const share = Math.round((longest.seconds / total) * 100)
  const times = longest.clicks === 1 ? "once" : `${longest.clicks} times`
  const clicked = longest.clicks > 0 ? `, and clicked through to it ${times}` : ""

  return {
    id: `move:${longest.section}`,
    kind: "move-section",
    section: longest.section,
    label: longest.label,
    fromIndex: longest.index,
    toIndex: 2,
    share,
    clicks: longest.clicks,
    seconds: longest.seconds,
    utterance:
      `Readers spend ${share}% of their time on ${longest.label}${clicked}. ` +
      `It is section ${longest.index + 1} of ${SECTION_ORDER.length} — move it nearer the top.`,
  }
}
