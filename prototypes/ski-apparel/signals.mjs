/**
 * What the page noticed about being read.
 *
 * Observations only — this section was on screen this long, this link was
 * clicked twice. Nothing here draws a conclusion or proposes a change; the rail
 * exists to show what a page *could* know about its readers, and that is a
 * separate question from what it should do with it.
 *
 * Everything here is pure. The server holds the readings.
 */

/**
 * The sections this page has, by the `anchor` props that name them.
 *
 * Their order is not here. It belongs to the tree, and a list kept beside the
 * tree is a second copy that can disagree with it.
 */
export const SECTION_LABELS = {
  top: "the opening",
  layers: "shell construction",
  helmets: "helmets",
  goggles: "goggles",
  fit: "the questions",
}

/** How many events the feed keeps. Enough to watch a click land, not a log. */
const FEED_LENGTH = 14

const isSection = (anchor) => Object.hasOwn(SECTION_LABELS, anchor)

export const emptyReadings = () => ({ dwell: {}, reached: {}, navClicks: {}, faqClicks: {}, feed: [] })

const bump = (counts, key) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 })

const logged = (readings, entry) => [entry, ...readings.feed].slice(0, FEED_LENGTH)

/**
 * One observation, folded in.
 *
 * `dwell` accumulates rather than replaces because a reader who scrolls back is
 * telling you something a last-write-wins counter would throw away.
 *
 * The feed takes clicks and the *first* arrival at a section, never a dwell
 * tick. A tick a second per visible section would bury every click under a
 * column of identical lines, and the thing worth watching is a person acting.
 */
export const record = (readings, event, at) => {
  if (event.kind === "dwell" && isSection(event.section)) {
    const first = readings.reached[event.section] !== true
    return {
      ...readings,
      reached: { ...readings.reached, [event.section]: true },
      dwell: { ...readings.dwell, [event.section]: (readings.dwell[event.section] ?? 0) + event.ms },
      feed: first ? logged(readings, { kind: "reached", subject: SECTION_LABELS[event.section], at }) : readings.feed,
    }
  }

  if (event.kind === "nav-click" && isSection(event.section)) {
    return {
      ...readings,
      navClicks: bump(readings.navClicks, event.section),
      feed: logged(readings, { kind: "nav-click", subject: SECTION_LABELS[event.section], at }),
    }
  }

  if (event.kind === "faq-click" && typeof event.question === "string" && event.question.length > 0) {
    return {
      ...readings,
      faqClicks: bump(readings.faqClicks, event.question),
      feed: logged(readings, { kind: "faq-click", subject: event.question, at }),
    }
  }

  return readings
}

/** Dwell per section in seconds, in the order the page has them. */
export const summarise = (readings, order) =>
  order.map((section) => ({
    section,
    label: SECTION_LABELS[section] ?? section,
    seconds: Math.round((readings.dwell[section] ?? 0) / 100) / 10,
    clicks: readings.navClicks[section] ?? 0,
    reached: readings.reached[section] === true,
  }))

/** Every question a reader has opened, most-opened first. */
export const questionsOpened = (readings) =>
  Object.entries(readings.faqClicks)
    .map(([question, count]) => ({ question, count }))
    .sort((first, second) => second.count - first.count)
