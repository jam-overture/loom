import {
  buildElement,
  buildSlot,
  createTree,
  sequentialIdFactory,
  COMPOSITION_OUTCOME_KINDS,
  type CompositionOutcomeKind,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

import { askById, type AskId } from "../adapt/asks"
import type { ChangeRecord } from "../adapt/record"
import { protectedInPlainWords } from "../adapt/run"
import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { action, cell, columns, heading, prose, row, section, stack } from "../nodes"
import {
  DEMO,
  internalHref,
  SITE_THEMES,
  surfaceHref,
  THE_RECORD,
  THE_RULES,
  WHEN_IT_GOES_WRONG,
} from "../site"

import type { PageContext } from "./home"

/**
 * The page for the question the other six answer only in their happy form.
 *
 * `/` shows a change happening. `/how-it-works` walks one from the request to
 * the record. `/the-rules` is what you decide in advance, `/the-record` what you
 * are left holding, `/what-you-run` the shape of the thing and
 * `/your-components` what you hand it. Six pages about a change that **worked**
 * — and the reader this project's recorded positioning names, somebody who
 * cannot ship un-reviewed output because they answer to a client or a
 * regulator, reads all six and asks the only question they were ever going to
 * ask: *and when it doesn't?*
 *
 * The answer is the best one this product has and the site was not making it.
 * **A request to change a page can end five ways, and exactly one of them
 * touches the page.** Two of the other four never reach the rules at all. That
 * is a description of code rather than a position, which is why this page did
 * not wait on the licence line: nothing on it says what Loom costs, who it is
 * for, or what may be built on it.
 *
 * **Nothing here is reassurance and the difference matters.** A page of the form
 * *don't worry, we handle errors* is worth nothing to the reader it is aimed at,
 * because every product says it. What this page does instead is name the five
 * endings, say which of them leave a page untouched, and then let a visitor
 * watch the one everybody wants to see — a refusal — happen against this site's
 * own published front door, with the page it was refused on printed underneath,
 * unchanged and counted.
 */

/**
 * The five endings, in plain words, keyed by the runtime's own name for each.
 *
 * **The keys are `CompositionOutcomeKind` and the sentences are this page's.**
 * `COMPOSITION_OUTCOME_KINDS` publishes the list and its order, and its note in
 * `pipeline.ts` names exactly this kind of reader — *"a surface explaining what
 * a host must handle"* — as one of the things that would want to walk it,
 * observing that such a walker keeps its own copy because a `switch` is
 * exhaustive at compile time and enumeration has no answer.
 *
 * So this is that copy, and `endingsOf` holds it to the original **in both
 * directions**. An ending nobody here has written a sentence for is a way a
 * reader's page can end that this page does not mention; a sentence for an
 * ending the runtime no longer has is this page describing something that
 * stopped happening. Either one throws while the page is being built, which is
 * a failing test rather than a landing page quietly going on saying *five*.
 *
 * That is the 9 September lesson in a third place. A fact the code held and the
 * page could not reach was a fact the page eventually contradicted; this is the
 * same fact — *how an ask can end* — read off the one list that knows.
 */
type Ending = {
  readonly kind: CompositionOutcomeKind
  /** Two or three words, as a reader would say it. Never the runtime's name. */
  readonly name: string
  /** What happened, in one sentence. */
  readonly what: string
  /**
   * Whether your page is different afterwards.
   *
   * The load-bearing column, and the whole argument of the page: it is `true`
   * for exactly one of the five. Declared rather than derived because a page
   * builder is synchronous and running five requests to compose one table would
   * make every visit to this page perform every demonstration on it — the same
   * seam, and the same reason, as `Ask.answer`. `when-it-goes-wrong.test.ts`
   * puts the reachable ones through the real sequence and holds them here.
   */
  readonly changesYourPage: boolean
  /** What your page looks like afterwards, in the words the column prints. */
  readonly after: string
}

const ENDINGS: readonly Ending[] = [
  {
    kind: "applied",
    name: "It happened",
    what: "Your rules let this one through on its own, so the change was made.",
    changesYourPage: true,
    after:
      "Changed — and the change that puts it back was written down in the same moment, before you had asked for it.",
  },
  {
    kind: "awaiting-confirmation",
    name: "It waits for you",
    what:
      "Your rules would not let this one through unwatched, so it stops and asks a person first.",
    changesYourPage: false,
    after: "Exactly as it was, for as long as nobody says yes.",
  },
  {
    kind: "rejected",
    name: "It is refused",
    what:
      "It would take away something you marked as off limits. Agreeing with it does not move this one.",
    changesYourPage: false,
    after: "Exactly as it was.",
  },
  {
    kind: "not-interpreted",
    name: "Nothing came back",
    what:
      "The AI gave back nothing that was a change to your page — it was unreachable, or what arrived could not be read.",
    changesYourPage: false,
    after: "Exactly as it was, and your reader never knew there had been a question.",
  },
  {
    kind: "not-applicable",
    name: "It no longer fits",
    what:
      "The change was worked out against your page as it stood a moment earlier, and your page has moved since.",
    changesYourPage: false,
    after: "Exactly as it was. It is dropped rather than fitted to a page it was not written for.",
  },
]

/**
 * The endings, in the runtime's order, checked against the runtime's list.
 *
 * Not `ENDINGS` directly, and the order is not this file's either: a reader
 * taking them in `COMPOSITION_OUTCOME_KINDS`'s order meets the three the rules
 * decide and then the two that never reached them, which is the shape of the
 * thing. Re-ordering the array above changes nothing on the page, which is the
 * property that stops the two lists drifting in the one way a test would find
 * hardest to see.
 */
export const endingsOf = (): readonly Ending[] =>
  COMPOSITION_OUTCOME_KINDS.map((kind) => {
    const ending = ENDINGS.find((one) => one.kind === kind)

    if (ending === undefined) {
      throw new Error(`loom: a request can end as ${kind} and ${WHEN_IT_GOES_WRONG.path} does not say so`)
    }

    return ending
  })

/**
 * The count the page leads with, and it is counted rather than typed.
 *
 * *Four of the five* is the single most persuasive sentence available to this
 * product and it is one number away from being a lie. A sixth ending that
 * changed a page would make it *four of the six*; an ending that stopped
 * changing one would make it five. Both are a rebuilt page here and neither is
 * a digit anybody has to remember.
 */
export const endingsLeavingThePageAlone = (): number =>
  endingsOf().filter((ending) => !ending.changesYourPage).length

/**
 * A small count as a reader would say it aloud.
 *
 * "4 of them leave your page exactly as it was" is a derived number doing the
 * work of a word, and a digit mid-sentence in a lead paragraph reads as a
 * statistic rather than as a fact about how the thing behaves. The list is
 * short because the counts on this page are: a number past it falls back to the
 * digit, which is ugly and correct, rather than throwing on a page that would
 * otherwise have been fine.
 */
const IN_WORDS: readonly string[] = [
  "None",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
]

export const inWords = (count: number): string => IN_WORDS[count] ?? String(count)

/** The request this page runs in front of the reader, and why it is that one. */
export const DEMONSTRATED_ASK: AskId = "drop-pitch"

/**
 * The name the refusal band answers to, spelled once.
 *
 * Two readers need to agree on it and they are in the same file but not in the
 * same function — the hero writes the link and the band writes the anchor — so
 * it is the same argument `BAND` makes for the front door's eyebrows, at a
 * smaller scale. A link pointing at a band that has since been renamed is a
 * button that silently does nothing, and nothing else on the page would say so.
 */
export const REFUSAL_ANCHOR = "refused"

/**
 * What the refusal band is handed, once somebody has run it.
 *
 * The same seam the mechanism page and the front door use, for the same reason:
 * a page builder is synchronous and a request through the whole sequence is
 * not. `render.ts` runs it against the front door **as this site publishes it**
 * rather than against a fixture kept beside this file, because the claim being
 * made is about this site and a reader can go and check it.
 */
export type RefusalContext = {
  /** The record of the refused request, and the page it was refused on. */
  readonly refusal?: RefusedRun
}

export type RefusedRun = {
  readonly record: ChangeRecord
  /**
   * How many pieces the page had before the request, and how many after.
   *
   * Two numbers rather than one boolean, because *nothing moved* is the claim
   * and a boolean is this page asserting it. These are counted off the page the
   * request was actually run against and the page the sequence handed back, so
   * the reader is reading the measurement rather than our word for it.
   */
  readonly piecesBefore: number
  readonly piecesAfter: number
}

export type WrongContext = PageContext & RefusalContext

/**
 * How many pieces a page is made of, counted by walking it.
 *
 * The site says *pieces* wherever the machinery says nodes — the front door's
 * panel has reported *"11 pieces moved"* since the band was written — so this
 * counts the same thing that sentence counts, and a reader comparing the two
 * numbers is comparing like with like.
 */
export const piecesIn = (node: LoomNode): number =>
  node.kind === "text" ? 1 : 1 + node.children.reduce((sum, child) => sum + piecesIn(child), 0)

const hero = (ids: IdFactory, context: WrongContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "When it goes wrong",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Most of the time, nothing happens to your page", { balance: true }),
      ]),
      prose(
        ids,
        `Asking to change a page can end ${inWords(endingsOf().length).toLowerCase()} ways. ${inWords(endingsLeavingThePageAlone())} of them leave your page exactly as it was. This is what each one is, and what you are holding afterwards.`,
        { size: "lead", measured: true }
      ),
      buildSlot(ids, "actions", [
        action(
          ids,
          "See one refused, here",
          internalHref(context.origin, `${WHEN_IT_GOES_WRONG.path}#${REFUSAL_ANCHOR}`, context.theme),
          { variant: "primary", scale: "large" }
        ),
        action(ids, "What you decide in advance", internalHref(context.origin, THE_RULES.path, context.theme), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
  })

/**
 * The table, and the third column is the reason it exists.
 *
 * A reader worried about an AI in their page is worried about one thing, and it
 * is not accuracy — it is what they will find on the site tomorrow morning. The
 * first two columns are the taxonomy and the third is the answer, so the third
 * is the one a reader reads down.
 */
const endings = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "The five endings" },
    "Every way an ask can end, and what your page looks like afterwards",
    [
      prose(
        ids,
        "This is the whole list, not a selection of the interesting ones. It is read off the machinery, in the order the machinery gives them, and a sixth way to end would stop this page being published rather than quietly not appear on it.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.table",
        props: {
          tone: "panel",
          rules: "rows",
          caption: "The five ways a request to change a page can end",
        },
        children: [
          /**
           * Two columns, and the name and its sentence share the row heading.
           *
           * The obvious shape is three — the name as a short bold handle, then
           * what happened, then the answer — and it was built that way and read
           * at 390px, where it fails. `loom.table` wraps rather than crushing
           * itself and hands the overflow to a scrolling wrapper, so a third
           * column at that width puts **"Your page afterwards" off the right
           * edge**: the one column the band exists for, behind a sideways push,
           * on the viewport most likely to meet it. Two columns fit in 284px
           * with nothing to scroll.
           *
           * The cost is a row heading carrying a whole sentence, which on a
           * phone is a column of solid bold. That is a worse-looking band and a
           * better-reading one, and the trade only goes this way because of
           * which column would have been the one lost.
           */
          columns(ids, ["What happened", "Your page afterwards"]),
          ...endingsOf().map((ending) =>
            row(ids, [
              cell(ids, `${ending.name} — ${ending.what}`, { role: "row" }),
              cell(ids, ending.after),
            ])
          ),
        ],
      }),
      prose(
        ids,
        "The first row is the only one that touches your page, and it is the only one anybody builds a demonstration around. The four below it are the product.",
        { measured: true }
      ),
    ]
  )

/**
 * The two nobody asks about, given a band rather than a row.
 *
 * They are the bottom two rows of the table above and they are the two that
 * deserve a paragraph, because both are failures of the *machine* rather than
 * decisions by the rules — which is the pair a reader is actually worried
 * about. A table row can say what they are; it cannot say why neither one can
 * half-happen, and that is the fact worth having.
 */
const neverReachedYou = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "Before your rules ever saw it" },
    "Two of the five never get as far as being judged",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "two", density: "loose" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "The AI gave back nothing usable",
              body:
                "It was unreachable, it answered with something that was not a change, or it asked for a piece of your page that does not exist. None of that gets anywhere near your page: a change has to be a change to something first. Your reader sees the page you wrote.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Your page moved while it was thinking",
              body:
                "A change is worked out against your page as it stood when the question was asked. If your page has moved since — you published, or another change landed — the old one is not fitted to the new one. It is dropped. A change reaches the page it was written for or no page at all.",
            },
          }),
        ],
      }),
      prose(
        ids,
        "That second one is the failure nobody expects and the one that quietly ruins things elsewhere: a change worked out ten seconds ago, applied to a page that has moved, produces a page nobody wrote and nobody asked for.",
        { measured: true }
      ),
    ]
  )

/**
 * The refusal, run here, on this page, against the page this site publishes.
 *
 * Every claim above this band is a sentence, and a sentence about refusing
 * things is the cheapest sentence in the industry. So the band spends the one
 * asset this surface has that a description of it does not: the sequence is
 * real, the front door is the real one, and the two counts underneath are the
 * page before and the page after, taken off the trees rather than asserted.
 *
 * It is the request `/` offers as its fifth button, so a visitor who came from
 * there is watching the same refusal a second time with the record opened up,
 * rather than a different one arranged for this page.
 */
const refused = (ids: IdFactory, context: WrongContext): LoomNode => {
  const refusal = context.refusal

  return section(
    ids,
    { tone: "accent", width: "wide", eyebrow: "Refused", anchor: REFUSAL_ANCHOR },
    "One being refused, on this site, a moment ago",
    refusal === undefined
      ? [
          prose(
            ids,
            "This band runs a real request against the front door of this site and prints what came back. It is not running right now.",
            { size: "lead", measured: true }
          ),
        ]
      : [
          prose(
            ids,
            "Not an example. This request was put to the front door of this site while this page was being built for you, and these are the lines that came back.",
            { size: "lead", measured: true }
          ),
          buildElement(ids, {
            type: "loom.table",
            props: {
              tone: "panel",
              rules: "rows",
              caption: "What was asked, and what the rules said",
            },
            children: [
              columns(ids, ["The record", "What it says"]),
              row(ids, [
                cell(ids, "Somebody asked for", { role: "row" }),
                cell(ids, `“${refusal.record.asked}”`),
              ]),
              row(ids, [
                cell(ids, "It would have", { role: "row" }),
                cell(ids, refusal.record.proposed),
              ]),
              row(ids, [
                cell(ids, "How much that is", { role: "row" }),
                cell(ids, refusal.record.measured),
              ]),
              row(ids, [
                cell(ids, "What your rules said", { role: "row" }),
                cell(ids, refusal.record.verdictLine),
              ]),
              row(ids, [
                cell(ids, "The page it was asked of", { role: "row" }),
                cell(
                  ids,
                  `${refusal.piecesBefore} pieces before the request, and ${refusal.piecesAfter} after it. Not one of them moved.`
                ),
              ]),
            ],
          }),
          prose(
            ids,
            `It is refused because this site marked two things as off limits — ${protectedInPlainWords().join(", and ")} — and taking either away is the one weight no answer moves. There is no button on this page that overrides it, and that is the difference between a rule and a suggestion.`,
            { measured: true }
          ),
          stack(ids, { direction: "row", gap: "snug", wrap: true }, [
            action(ids, "Try it yourself on the front door", internalHref(context.origin, "/", context.theme), {
              variant: "secondary",
              scale: "medium",
            }),
          ]),
        ]
  )
}

/**
 * The ending everybody forgets to ask about: the one that worked and should not
 * have.
 *
 * Four endings leaving a page alone is an argument about the machinery, and a
 * reader who is paying attention will notice it says nothing about the fifth.
 * A page that stopped at the four would be making its case by leaving out the
 * only case that costs anybody anything — the same omission `/what-you-run`'s
 * fourth row exists to refuse.
 */
const landedAndWrong = (ids: IdFactory, context: WrongContext): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "And the fifth" },
    "A change landed, and it was the wrong one",
    [
      prose(
        ids,
        "This is the only ending where something is different, so it is the only one where being wrong costs you anything. Nothing above prevents it: your rules let it through because you told them to let that kind through.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "loose" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "You can tell it happened",
              body:
                "Every change that lands is written down as it lands: what was asked for, in the words somebody typed, what moved, how much of it, and which of your rules allowed it.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "You can tell who asked",
              body:
                "The request carries where it came from and who made it. A change nobody can account for is the thing this is built to make impossible, not the thing it hopes will not happen.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "You can put it back",
              body:
                "The change that reverses it was written at the same moment as the change itself, against the page as it then stood. Putting it back restores what was there rather than writing something similar.",
            },
          }),
        ],
      }),
      prose(
        ids,
        "Putting it back is a change like any other, which means it is weighed by your rules and written down too. There is no side door, and the record does not have a gap where somebody undid something.",
        { measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(ids, "What the record holds", internalHref(context.origin, THE_RECORD.path, context.theme), {
          variant: "secondary",
          scale: "medium",
        }),
      ]),
    ]
  )

const closing = (ids: IdFactory, context: WrongContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "You decide which of the five a change gets",
    [
      prose(
        ids,
        "None of the endings above is our judgement about your page. Which one a change gets is worked out from what you wrote down before anybody asked for anything.",
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
        action(ids, "What you decide in advance", internalHref(context.origin, THE_RULES.path, context.theme), {
          variant: "primary",
          scale: "large",
        }),
        action(ids, "Watch one on a page of ours", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
    { align: "center" }
  )

export const whenItGoesWrongPageTree = (context: WrongContext): LoomTree => {
  const ids = sequentialIdFactory("wrong")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: WHEN_IT_GOES_WRONG,
  }

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: {
        [THEME_PROP_KEY]: SITE_THEMES[context.theme].selection,
        width: "wide",
        fills: true,
      },
      children: [
        siteHeader(ids, chrome),
        hero(ids, context),
        endings(ids),
        neverReachedYou(ids),
        refused(ids, context),
        landedAndWrong(ids, context),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}

/** What the page claims, for the tests that hold it to the machinery. */
export const THE_ENDINGS = {
  all: endingsOf,
  leavingThePageAlone: endingsLeavingThePageAlone,
  demonstrated: DEMONSTRATED_ASK,
  ask: () => askById(DEMONSTRATED_ASK),
} as const
