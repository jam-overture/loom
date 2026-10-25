import type { RefusalTally } from "@/app/_lib/reader-signals/refusals"

import { plainMoment } from "./when"

/**
 * What a project's *Signals* screen says about the deliveries the door
 * refused (0311), as a function of the tallies.
 *
 * One sentence per reason, each saying what a person can do about it, because
 * the screen is where somebody looks when their site is posting and nothing
 * is arriving. The site a delivery came from is named for `wrong-site`
 * because it is the whole answer: *from `https://loomjs.org`* beside a project
 * that names `www.loomjs.org` needs no other explanation.
 */
export type TurnedAway = {
  readonly refused: number
  /** One per reason that has happened, in the order the store lists them. */
  readonly lines: readonly string[]
}

const timesOf = (refused: number): string =>
  refused === 1 ? "1 delivery" : `${refused.toLocaleString("en-GB")} deliveries`

const lineFor = (tally: RefusalTally): string => {
  const when = plainMoment(new Date(tally.lastAt).toISOString())
  const times = timesOf(tally.refused)

  switch (tally.reason) {
    case "wrong-site":
      return tally.lastOrigin === null
        ? `${times} named no site, the latest on ${when}. Pages posting from your site always name it, so these were sent from somewhere else.`
        : `${times} came from a site this project does not take signals from, the latest from ${tally.lastOrigin} on ${when}. If that is your site, change the address in Settings.`
    case "closed":
      return `${times} arrived after this project was closed, the latest on ${when}. Take the snippet off the site, or open a new project for it.`
    case "unreadable":
      return `${times} could not be read, the latest on ${when}. Check the snippet on your site is the one on Connect your site.`
  }
}

export const turnedAwayOf = (tallies: readonly RefusalTally[]): TurnedAway => ({
  refused: tallies.reduce((sum, tally) => sum + tally.refused, 0),
  lines: tallies.map(lineFor),
})
