import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

/**
 * The page the demo changes, and it belongs to somebody else.
 *
 * It is a real marketing page rather than a fixture: §4d builds the site from
 * this same vocabulary, so a demo page that could not stand as a landing page
 * would be demonstrating a library nobody would ship. Everything here is a node
 * — there is no markup in this file and no styling on any of it — which is the
 * property the demo exists to make visible.
 *
 * **Whose page it is, is the load-bearing decision of this file.**
 *
 * Every band on it used to be about Loom. The hero read *"Your AI can change
 * this page. You can see exactly what it changed."*; the logos were "Proposals,
 * The Gate, Revisions, Telemetry"; the features were "A model emits a delta
 * against the tree it was shown"; the three figures were *4 delta operations*,
 * *2 axes the Gate weighs*, *0 lines of markup in this page*; the pull quote
 * cited a decision record by number. So the specimen and the instrument were
 * both Loom, at three times the type size, and a stranger's first screen was a
 * second pitch rather than a page. Two things followed and both are fatal to a
 * demo:
 *
 * - **The jargon was the wallpaper.** The maintainer's direction is that plain
 *   language is the default and the technical record is one click away. The
 *   record obeyed it. The page behind the record printed *delta*, *the Gate*,
 *   *primitives* and *revision* unbidden, at sixty pixels, before a visitor had
 *   pressed anything.
 * - **Nothing was at stake.** Holding a change to a page about delta operations
 *   is a demonstration of a mechanism. Holding a change to a clinic's waiting
 *   times is the reason the mechanism exists, and the audience this is a
 *   conversion artifact for — people who cannot ship un-reviewed AI output — can
 *   only recognise the second one.
 *
 * So the page is now **a physiotherapy clinic that does not exist**, and the
 * fiction is disclosed in the bar above it rather than left to be inferred. It
 * is an ordinary small business page: services, numbers it is proud of, a
 * patient's words, the questions people ask before they book. Nothing on it
 * names Loom, and nothing on it explains itself — the rail beside it is the only
 * voice that does, which is the division of labour this whole surface rests on.
 *
 * Its contact points are reserved-for-fiction identifiers on purpose: the
 * `.example` TLD is unroutable by RFC 2606, and `020 7946 0xxx` is the range
 * Ofcom reserves for drama. A specimen page must be plausible enough to stand
 * as a real page and must never reach a real inbox or a real telephone.
 *
 * Ids are sequential and namespaced, so the tree is byte-identical on every
 * instance that builds it. That matters twice: the store keys the tree by an id
 * this derives, and the presets address nodes by id, so a demo whose ids drifted
 * per process would be a demo whose scripted changes stopped applying.
 */

export const DEMO_THEME_NODE_PROP = THEME_PROP_KEY

/** The theme a visitor arrives on, and the one a preset re-themes away from. */
export const DEMO_STARTING_THEME: JsonObject = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
}

/** Where the presets re-theme to: the same tree, three different ids (0049). */
export const DEMO_ALTERNATE_THEME: JsonObject = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
}

const heading = (ids: IdFactory, level: number, text: string, balance = false): LoomNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: balance ? { level, balance } : { level },
    children: [buildText(ids, text)],
  })

const prose = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

const action = (ids: IdFactory, label: string, href: string, props: JsonObject): LoomNode =>
  buildElement(ids, { type: "loom.action", props: { href, ...props }, children: [buildText(ids, label)] })

/** Reserved by RFC 2606, so a visitor who presses this reaches nobody. */
const CLINIC_EMAIL = "mailto:reception@harbourline.example"

/** Ofcom reserves 020 7946 0xxx for drama, so this rings nowhere. */
const CLINIC_PHONE = "tel:+442079460104"

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "aurora", align: "center", stature: "tall", eyebrow: "Harbourline Physiotherapy · Southbank" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 1, "Back to the things you had stopped doing.", true)]),
      prose(ids, "One-to-one physiotherapy for injury, surgery recovery and pain that has outstayed its welcome. A full assessment on your first visit, and a plan that fits the week you actually have.", {
        size: "lead",
        measured: true,
      }),
      /*
       * The clinic's own calls to action, and the previous pair is worth
       * recording because it was wrong twice over.
       *
       * They read *Read the source* and *Read the decisions* and went to
       * GitHub: Loom's calls to action, on a page that is not Loom's, and the
       * largest clickable targets on the screen leading away from the
       * demonstration. Before that the primary one said *Change this page* —
       * the same call the rail was making, six inches away, in larger type, on
       * a surface whose whole difficulty was telling the specimen from the
       * instrument.
       *
       * A page belonging to somebody has that somebody's buttons on it. These
       * are what a small clinic would put there, and where they go is the point
       * of them: nowhere, safely, by construction.
       */
      buildSlot(ids, "actions", [
        action(ids, "Book an assessment", CLINIC_EMAIL, { variant: "primary", scale: "large" }),
        action(ids, "Call 020 7946 0104", CLINIC_PHONE, { variant: "secondary", scale: "large" }),
      ]),
    ],
  })

/**
 * Insurers, and they carry more weight than they look.
 *
 * A logo cloud on a clinic's page is a claim about who will pay — which is the
 * cheapest way to put something at stake on a specimen without writing a word
 * about stakes. The names are invented; a real insurer's name here would be a
 * claim about a real company made by a page that is not theirs.
 */
const logos = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.logo-cloud",
    props: { label: "Recognised by", align: "center" },
    children: [
      buildElement(ids, { type: "loom.logo", props: { name: "Meridian Health" } }),
      buildElement(ids, { type: "loom.logo", props: { name: "Colworth Assurance" } }),
      buildElement(ids, { type: "loom.logo", props: { name: "Ardsley Care" } }),
      buildElement(ids, { type: "loom.logo", props: { name: "Northgate Mutual" } }),
    ],
  })

const feature = (ids: IdFactory, icon: string, title: string, body: string): LoomNode =>
  buildElement(ids, { type: "loom.feature", props: { icon, title, body } })

const features = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "What we treat", tone: "canvas" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "Six reasons people come to us")]),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three" },
        children: [
          feature(ids, "🏃", "Sports injuries", "Hamstrings, ankles and shoulders, usually seen the same week, with a return-to-play plan you can hold us to."),
          feature(ids, "🦴", "After an operation", "Structured rehabilitation for a new knee, hip or shoulder, in step with whatever your surgeon has asked for."),
          feature(ids, "💺", "Necks and backs at work", "For the pain that arrives with the working day. We look at how you sit, stand and carry, not only at where it hurts."),
          feature(ids, "👶", "Before and after birth", "Pelvic health, core recovery and getting back to exercise at a pace that is yours rather than a leaflet's."),
          feature(ids, "🧗", "Staying steady", "Balance, strength and confidence on stairs and pavements — for anyone who has had a fall, or would rather not."),
          feature(ids, "🕰️", "Pain that has lasted", "Where nothing has helped yet. Longer appointments, and a plan measured in months rather than in sessions."),
        ],
      }),
    ],
  })

/**
 * The three figures a small business is proudest of, and the reason *Take the
 * numbers off* is the most persuasive button on the surface.
 *
 * They used to be facts about Loom — *4 delta operations*, *2 axes the Gate
 * weighs*, *0 lines of markup in this page* — and nobody minds if a footnote
 * about delta operations disappears. A waiting time and a headcount are a
 * clinic's proof that it can see you, so an AI quietly taking them off the page
 * is the exact thing the Gate exists to stop happening quietly. The mechanism
 * did not change; what changed is that a stranger can now feel why it is there.
 */
const stats = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.stat-grid",
    props: { columns: "three" },
    children: [
      buildElement(ids, { type: "loom.stat", props: { value: "3,400", label: "appointments last year", caption: "four clinicians, six days a week" } }),
      buildElement(ids, { type: "loom.stat", props: { value: "24", label: "years on the same street", caption: "opened in 2001, three doors down" } }),
      buildElement(ids, { type: "loom.stat", props: { value: "92%", label: "seen within a week", caption: "measured across the last twelve months" } }),
    ],
  })

const quote = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.quote",
    props: {
      quote: "I had been told for two years to live with it. Nine weeks later I walked the coast path with my daughter. Nobody promised me that — they just kept showing me what had changed.",
      author: "Rosalind K.",
      role: "knee rehabilitation, 2025",
      emphasis: "feature",
    },
  })

const faqs = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "Before you come" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "What people ask us first")]),
      buildElement(ids, {
        type: "loom.faq-list",
        children: [
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "Do I need a referral?",
              answer: "No — you can book directly with us. If you are claiming on private insurance it is worth checking your policy, because a few of them still ask for a note from your GP first.",
              open: true,
            },
          }),
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "How long is a first appointment?",
              answer: "Fifty minutes, which is longer than the follow-ups on purpose. That is the assessment, the first treatment and the plan, and you leave with the plan written down.",
            },
          }),
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "What should I bring, and what should I wear?",
              answer: "Anything you can move in. If it is a knee or a hip, shorts help. Bring any scans, letters or discharge notes you already have, even the old ones.",
            },
          }),
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "Can I claim it back?",
              answer: "If you are with one of the insurers above, usually. We can invoice most of them directly; otherwise we invoice you and you claim it back yourself.",
            },
          }),
        ],
      }),
    ],
  })

const closing = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "accent", width: "readable" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "Come and get looked at properly", true)]),
      prose(ids, "Six days a week, two minutes from the station. Most people are seen within a week of getting in touch, and the first thing we do is listen.", {
        tone: "muted",
        align: "center",
      }),
      action(ids, "Book an assessment", CLINIC_EMAIL, { variant: "primary", scale: "large" }),
    ],
  })

/**
 * The tree a visitor arrives at. Rebuilt per session rather than shared,
 * because a demo whose visitors edited one another's page would be a
 * multiplayer surface nobody asked for — and the ids are deterministic, so two
 * sessions still address the same nodes by the same names.
 */
export const demoPageTree = (): LoomTree => {
  const ids = sequentialIdFactory("demo")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [DEMO_THEME_NODE_PROP]: DEMO_STARTING_THEME, width: "wide", fills: true },
      children: [
        hero(ids),
        logos(ids),
        features(ids),
        buildElement(ids, { type: "loom.divider", props: { ornament: "diamond" } }),
        stats(ids),
        quote(ids),
        faqs(ids),
        closing(ids),
      ],
    }),
    ids
  )
}
