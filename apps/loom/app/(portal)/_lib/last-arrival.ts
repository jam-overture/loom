import type { Latest } from "./arrivals"
import { rangeParam, type SignalsRange } from "./signals-range"
import { plainMoment } from "./when"

/**
 * The *Signals* figure for when the last delivery came, from which site and
 * on which page (`docs/portal-wireframes.md`, *1 · Signals*, the four
 * figures). Pure.
 *
 * **The site is the project's own address, and only when it names one.** The
 * door takes a project's signals from that origin and nowhere else (0298), so
 * a project with an address can say exactly where its last delivery came from.
 * A project without one takes them from any site holding its key, and Loom
 * keeps no origin on a delivery, so the figure says that rather than guess.
 *
 * **The page links to where it can be followed.** A kept delivery is on
 * *Events*, so the link is *Events* on that page. A page last counted has no
 * delivery left to list but has its row on *By page*, so the link opens its
 * drawer there. Either way the link lands on something, never on an empty list.
 */

export type LastArrivalFigure = {
  readonly label: string
  readonly value: string
  readonly note: string
  /** Where the page it came from can be followed; absent while nothing has arrived. */
  readonly link: { readonly label: string; readonly href: string } | undefined
}

export type LastArrivalContext = {
  readonly projectId: string
  /** The project's own address, when it has said so (0298). */
  readonly host: string | undefined
  /** The names pages published for themselves, by id (`pageNamesOf`). */
  readonly names: ReadonlyMap<string, string>
  /** The range the screen is read over, kept on the link. */
  readonly range: SignalsRange
}

const siteWords = (host: string | undefined): string =>
  host === undefined ? "a site holding this project's key" : host

const pageWords = (latest: Latest, names: ReadonlyMap<string, string>): string => {
  const name = names.get(latest.treeId)

  return name === undefined ? `the page ${latest.treeId}` : `${name} (${latest.treeId})`
}

const withQuery = (base: string, query: Readonly<Record<string, string | undefined>>): string => {
  const kept = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]]))
  ).toString()

  return kept === "" ? base : `${base}?${kept}`
}

const linkOf = (latest: Latest, { projectId, range }: LastArrivalContext) => {
  const kept = rangeParam(range)

  return latest.kind === "arrived"
    ? {
        label: "Events on this page",
        href: withQuery(`/portal/${projectId}/signals`, { on: latest.treeId, range: kept }),
      }
    : {
        label: "This page on By page",
        href: withQuery(`/portal/${projectId}/signals/pages`, {
          page: latest.treeId,
          range: kept,
        }),
      }
}

export const lastArrivalFigureOf = (
  latest: Latest | undefined,
  context: LastArrivalContext
): LastArrivalFigure => {
  if (latest === undefined) {
    return {
      label: "Last arrival",
      value: "Nothing yet",
      note: "Nothing has arrived from one of your pages.",
      link: undefined,
    }
  }

  const page = pageWords(latest, context.names)

  return latest.kind === "arrived"
    ? {
        label: "Last arrival",
        value: plainMoment(latest.at),
        note: `Received from ${siteWords(context.host)}, on ${page}.`,
        link: linkOf(latest, context),
      }
    : {
        label: "Last counted",
        value: plainMoment(latest.at),
        note: `Last added up on ${page}. Nothing that arrived is still kept, so this is when it was counted, not when it arrived.`,
        link: linkOf(latest, context),
      }
}
