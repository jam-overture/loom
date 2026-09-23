import type { LoomNode } from "@loom/runtime"
import type { Metadata } from "next"

import { siteOrigin } from "@/app/(marketing)/_lib/site"
import { plainState } from "@/app/(portal)/_lib/vocabulary"

import { demoPageTree } from "./page-tree"
import { DEMO_LEADING_PRESET, elementsOf, firstOfType, presetById } from "./presets"
import { labelFor } from "./spotlight"

/**
 * What a shared link to the demo unfurls as.
 *
 * **The gap this closes is the whole reason the file exists.** Ten marketing
 * pages — every one of them a page whose job is to send somebody here — carry
 * `og:title`, `og:description`, `og:image` and a `summary_large_image` card,
 * drawn per address. `/demo` carried a `<title>` and a `<meta name=description>`
 * and nothing else, so the one surface built to be sent to a stranger was the
 * one surface that unfurled as a bare URL. Somebody who wants to show a
 * colleague what Loom is pastes this address, because it is the thing worth
 * showing — and what arrived in the channel was a link with no picture, no
 * title and no claim.
 *
 * **Not one word below is new.** The headline and the figures are read off
 * `demoPageTree()`, the ask is the leading preset's own `utterance`, the badge
 * and the sentence under it are `CHANGE_STATES.waiting` — the same shared
 * vocabulary the record card renders — and the chip is `spotlight.ts`'s, drawn
 * by the same call the ring on the stage makes. A share card is the one piece
 * of copy on a project that is read by people who never reach the page, so a
 * promise invented here would be the only sentence about this surface that
 * nothing on it could correct. There is no such sentence: the card is a
 * *quotation* of the demo, and the test holds it to that.
 */

/** 1.91:1, which is what every unfurler crops to. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const

export const DEMO_PATH = "/demo"

/**
 * The words the card is drawn from.
 *
 * Data rather than markup, for the reason every reading on this surface is
 * data: the picture is drawn in a route a `vitest` run cannot enter, and what
 * has to be assertable is that the card quotes the page rather than that a
 * `<div>` has a margin.
 */
export type DemoShareCard = {
  readonly wordmark: string
  readonly eyebrow: string
  /** The specimen's own eyebrow and headline, off the tree. */
  readonly pageEyebrow: string
  readonly pageHeadline: string
  /** The three figures the leading ask takes off the page. */
  readonly figures: readonly { readonly value: string; readonly label: string }[]
  /** The chip the stage draws on the band while the question is open. */
  readonly markLabel: string
  /** The badge and the sentence under it, from the shared vocabulary. */
  readonly badge: string
  readonly verdict: string
  /** What a visitor asked for, in the words the preset says they would type. */
  readonly ask: string
  /** What the page says about itself. The card's one full sentence of claim. */
  readonly footnote: string
}

const TITLE = "Change this page — Loom"

/**
 * The description is the page's own, and it is the sentence a stranger reads in
 * a channel before deciding whether to open anything. It says the three things
 * this surface is: a live page, an AI that changes it, and a record of what was
 * asked, decided and how to put it back.
 */
const DESCRIPTION =
  "A live page you can ask an AI to change, with the record of what was asked, what was decided and how to put it back."

/** A node's own words: its text children, in order, and nothing deeper. */
const textOf = (node: LoomNode): string =>
  node.kind === "text"
    ? node.value
    : node.children.filter((child) => child.kind === "text").map(textOf).join("")

/**
 * The card, read off the surface it is a picture of.
 *
 * Every lookup here can fail — a tree without a hero, a preset table that
 * renamed its lead — and every one of them throws rather than falling back to a
 * string typed in this file. A card drawn from a silent default is a card that
 * goes on advertising last month's page, which is the exact failure a picture
 * nobody on this project ever looks at is prone to.
 */
export const demoShareCard = (): DemoShareCard => {
  const tree = demoPageTree()

  const hero = firstOfType(tree, "loom.hero")
  if (hero === undefined) throw new Error("loom: the demo page has no hero to quote")

  const heading = elementsOf(hero).find(
    (element) => element.type === "loom.heading" && element.props["level"] === 1
  )
  if (heading === undefined) throw new Error("loom: the demo page's hero has no first-level heading")

  const stats = firstOfType(tree, "loom.stat-grid")
  if (stats === undefined) throw new Error("loom: the demo page has no stat grid for the lead ask")

  const lead = presetById(DEMO_LEADING_PRESET)
  if (lead === undefined) throw new Error(`loom: no preset is registered as ${DEMO_LEADING_PRESET}`)

  const waiting = plainState("waiting")

  return {
    wordmark: "Loom",
    eyebrow: "live demo",
    pageEyebrow: String(hero.props["eyebrow"] ?? ""),
    pageHeadline: textOf(heading),
    figures: elementsOf(stats)
      .filter((element) => element.type === "loom.stat")
      .map((element) => ({
        value: String(element.props["value"] ?? ""),
        label: String(element.props["label"] ?? ""),
      })),
    markLabel: labelFor("removed", "awaiting", "node", false),
    badge: waiting.label,
    verdict: waiting.meaning,
    ask: lead.utterance,
    footnote: DESCRIPTION,
  }
}

/**
 * Everything the demo's document says about itself.
 *
 * `metadataBase` is what makes the rest of it absolute: an unfurler is somebody
 * else's server, and a relative `og:image` is an image it cannot fetch. The
 * origin is `siteOrigin()` — the marketing lane's reader of `LOOM_SITE_ORIGIN`
 * and `VERCEL_URL`, imported rather than copied, because where this deployment
 * is served from is one fact and two readings of it would differ on exactly the
 * preview deployments nobody checks.
 *
 * The picture itself is named by nothing here. `demo/opengraph-image.tsx` is
 * Next's file convention, so the framework fills `og:image`, its dimensions and
 * its alt text from the route — which is the version that cannot go stale when
 * the image moves.
 */
export const demoShareMetadata = (origin: string = siteOrigin()): Metadata => ({
  metadataBase: new URL(origin),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: DEMO_PATH },
  openGraph: {
    type: "website",
    siteName: "Loom",
    url: DEMO_PATH,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
})
