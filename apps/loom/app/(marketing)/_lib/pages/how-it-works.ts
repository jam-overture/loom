import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

import type { PaperTrail, TrailLine } from "../adapt/paper-trail"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { JOURNEY, ordinal, spell, spellCapitalised, STEPS, STEPS_CAPITALISED } from "../journey"
import { action, heading, prose, section, stack } from "../nodes"
import {
  DECISIONS_URL,
  DEMO,
  HOW_IT_WORKS,
  SITE_THEMES,
  surfaceHref,
} from "../site"

import type { PageContext } from "./home"

/**
 * The mechanism page: what happens between someone asking for a change and the
 * page being different.
 *
 * Nothing on it is positioning. Every claim here is a description of code in
 * this repository, which is why it could be written before the maintainer has
 * answered anything — and it is the page the site needed second, because the
 * landing page's whole argument is that the middle step exists.
 */

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "grid", align: "start", stature: "standard", eyebrow: "The path a change takes" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, `${STEPS_CAPITALISED} steps, every time, in the same order`, {
          balance: true,
        }),
      ]),
      prose(
        ids,
        "Whatever asks for a change never gets to make it. The change is written down, measured, decided on and recorded first. Each of those is a separate step you can test, rather than a promise about a prompt.",
        { size: "lead", measured: true }
      ),
    ],
  })

/**
 * The steps themselves, off the one list that holds them (`journey.ts`).
 *
 * The markers are positions in that list rather than typed digits, which is the
 * small half of the change. The large half is that every sentence on this page
 * saying *how many* now comes off the same list, so a sixth step cannot arrive
 * and leave five correct-looking sentences standing behind it.
 */
const journey = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "End to end" }, "How a change travels", [
    buildElement(ids, {
      type: "loom.milestone-list",
      props: { rail: "line", density: "loose" },
      children: JOURNEY.map((step, index) =>
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: String(index + 1),
            title: step.title,
            body: step.body,
            state: "done",
          },
        })
      ),
    }),
  ])

const weighed = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "The middle step" },
    "What the Gate weighs",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "▲",
              title: "How much is at stake",
              body: "Named factors rather than one score out of ten: how much of the page moves, and whether the thing it touches is holding something else up.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "↺",
              title: "Whether it can be undone",
              body: "Worked out against the page as it stands right now, not in general. A change nobody can take back is a different kind of change, and it is weighed as one.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "§",
              title: "Which rules applied",
              body: "Yours and the built-in ones together. Which of them judged a change is kept with the change, so months later you can work out why the answer was what it was.",
            },
          }),
        ],
      }),
    ]
  )

const record = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Afterwards" }, "What you are left holding", [
    buildElement(ids, {
      type: "loom.split",
      props: { ratio: "even", align: "start" },
      children: [
        buildSlot(ids, "start", [
          heading(ids, 3, "A record, not a pile of file changes"),
          prose(
            ids,
            "Each entry names the change that produced it, who asked, which rule allowed it and what it replaced. You read the history instead of reconstructing it from what the files look like now.",
            { tone: "muted" }
          ),
        ]),
        buildSlot(ids, "end", [
          heading(ids, 3, "An undo that asks, like anything else"),
          prose(
            ids,
            "Putting something back means asking for the change that reverses it. It goes through the same rules, is written down as its own entry, and can itself be undone — so the way back is never a special case.",
            { tone: "muted" }
          ),
        ]),
      ],
    }),
  ])

/**
 * The five words a reader is about to meet, each said plainly first.
 *
 * The lines below are not written for a visitor — they are written for a
 * logging system, and printing them means printing our vocabulary raw. The
 * site's rule for a mechanism page is that a reserved word is allowed *once it
 * has been earned*: the plain phrase doing the work, the name after it, in that
 * order and in the same breath (`voice.test.ts`).
 *
 * So the glossary is not decoration and it is not an apology for the band. It
 * is the condition on which the band may exist at all, and every entry in it is
 * a word that genuinely appears in the run below rather than one we thought a
 * reader might like to know.
 */
export type GlossaryEntry = {
  /** The reserved word, exactly as `copy.ts` lists it. */
  readonly term: string
  /** The plain thing, which has to come first and has to do the work alone. */
  readonly plainly: string
  /** The naming half, which contains the term and nothing a reader needs. */
  readonly naming: string
}

/**
 * Exported because `voice.test.ts` reads it rather than keeping a second copy.
 *
 * This lane's own recorded lesson is that two spellings of one fact diverge and
 * the one that diverges is the prose — so the test that enforces *plain first*
 * is pointed at the list the page actually prints, and a line deleted here
 * fails there instead of quietly ending the discipline.
 */
export const GLOSSARY: readonly GlossaryEntry[] = [
  { term: "provenance", plainly: "Where a change came from", naming: "its provenance" },
  {
    term: "runtime",
    plainly: "Worked out by the machinery rather than guessed at by an AI",
    naming: "authored by the runtime",
  },
  {
    term: "inverse",
    plainly: "The change that reverses it, written at the same moment",
    naming: "its inverse",
  },
  { term: "disposition", plainly: "The answer your rules gave, and why", naming: "the disposition" },
  { term: "node", plainly: "A piece of the page", naming: "a node" },
]

export const glossaryLine = (entry: GlossaryEntry): string =>
  `${entry.plainly} — ${entry.naming}.`

const glossary = (ids: IdFactory): LoomNode =>
  stack(ids, { direction: "column", gap: "snug", align: "start" }, [
    /**
     * The seventh typed count on this site, and the one nothing else on the
     * page could have contradicted — which is why it is worth deriving anyway.
     * `GLOSSARY` is directly below and is already exported for `voice.test.ts`;
     * a sixth entry added there would have left this sentence saying five with
     * every test on the site still green.
     */
    prose(
      ids,
      `${spellCapitalised(GLOSSARY.length)} of our words appear in these lines. Here is each one first.`,
      { tone: "muted" }
    ),
    buildElement(ids, {
      type: "loom.list",
      props: { marker: "bullet", density: "tight", size: "small", measured: true },
      children: GLOSSARY.map((entry) =>
        buildElement(ids, {
          type: "loom.list-item",
          props: {},
          children: [buildText(ids, glossaryLine(entry))],
        })
      ),
    }),
  ])

/**
 * One stage of the run: what it is, in plain words, and then the line itself.
 *
 * The panel is labelled with the event's own name rather than with `json`,
 * which `loom.code` allows for exactly this — *"a filename is just as good a
 * label as a language"*. Seven panels all announcing the same format tell a
 * reader nothing; seven announcing what each line *is* are a contents page.
 */
/**
 * The one stage whose title is about a person, and who that person is.
 *
 * Every other stage narrates the machinery — the rules were settled, the change
 * was measured — and reads the same whoever is looking at it. The first one
 * names whoever asked, and it said *"Somebody asked for something"* two
 * paragraphs under a lead sentence that had just told the reader they were the
 * somebody. The front door's own panel says *"You asked for something"* for the
 * same line, so the page a visitor arrives from and the page they arrive at
 * would have disagreed about who they were.
 *
 * Only the title is ours to vary. The line under it is the runtime's and says
 * `"actor": "a visitor"` whoever is reading, which is correct and stays.
 */
const titleOf = (line: TrailLine, theirs: boolean): string =>
  theirs && line.type === "intent-received" ? "You asked for something" : line.title

const stage = (
  ids: IdFactory,
  line: TrailLine,
  index: number,
  theirs: boolean
): readonly LoomNode[] => [
  heading(ids, 3, `${index + 1}. ${titleOf(line, theirs)}`),
  prose(ids, line.plainly, { tone: "muted", measured: true }),
  buildElement(ids, {
    type: "loom.code",
    props: {
      language: `${line.type}.json`,
      density: "compact",
      ...(line.caption === undefined ? {} : { caption: line.caption }),
    },
    children: [buildText(ids, line.json)],
  }),
]

/**
 * The band the rest of this site can only describe.
 *
 * Everything above is a claim about what happens between a request and a
 * changed page. This is that happening, to the page this site publishes at `/`,
 * a moment before the reader loaded this one — not a fixture, not a
 * screenshot, and not written by hand. A listener was attached to a real
 * request and these are the lines it was handed, whole and in order.
 *
 * **One more line than there are steps**, and the extra one is worth the
 * sentence it costs: which rules were in force is settled and written down
 * *before* anything is worked out, so what judged a change is never something
 * anybody has to reconstruct afterwards.
 *
 * Both numbers in that sentence are counted rather than typed — the lines off
 * the trail this band is printing, the steps off `journey.ts` — because the
 * sentence is a claim about two lists the page is holding while it says it.
 *
 * It is long, and the length is the argument. A record you can fit on a slide
 * is a record that left something out.
 */
/**
 * Whose request this is the record of, in the one clause that varies.
 *
 * *"A moment ago somebody asked"* is true of the default and wrong of the
 * interesting case. A visitor arriving from the front door's panel has just made
 * this exact request and watched it happen; telling them somebody did is the
 * page failing to notice the one reader it was worth writing for.
 *
 * One sentence with one clause swapped rather than two sentences that agree
 * today. Two copies of a paragraph this long is the shape of defect this lane
 * has shipped a fix for three runs running, and it is cheaper not to write it.
 */
const whoAsked = (trail: PaperTrail, theirs: boolean): string =>
  `${theirs ? "You have just asked" : "A moment ago somebody asked"} the front page of this site for something — “${trail.asked}” — and this is everything the machinery said while it dealt with it. It is what a Loom site hands its own logging as a change goes through, and a deployment collects it by writing eight lines that put each one in a list.`

/** How many times the rules answered, which is one unless the visitor said yes. */
const answers = (trail: PaperTrail): readonly number[] =>
  trail.lines.flatMap((line, index) => (line.type === "disposition-decided" ? [index + 1] : []))

/**
 * How long the record is, and why — read off the run rather than typed beside it.
 *
 * It said *six lines for the five steps above* while the page could only ever
 * print one request, and every one of the three runs it can print now would have
 * made that sentence wrong in a different way. There are three shapes, and each
 * of them is a real answer the rules can give rather than a case being handled:
 *
 * - **It landed.** Six lines for five steps, and the extra one is the rules.
 *   The sentence this page has always carried.
 * - **It stopped at the answer.** A held change and a refused one produce no
 *   final line, because that line is the page changing and the page did not
 *   change. Saying six here would be wrong on exactly the two runs a visitor
 *   most wants to read.
 * - **It was held, and then the visitor said yes.** The change is put to the
 *   rules a second time and the whole second pass is in the record, so the run
 *   is far longer than five — and the length is the argument. A person
 *   approving is not the rules being skipped; it is the rules being asked again
 *   with the answer written down both times, and nothing else on this site can
 *   show that.
 *
 * Every number in all three is counted. The last shape is reachable only from
 * the front door's *I say yes* button, so the page a crawler fetches is
 * untouched by any of it.
 */
const lineCount = (trail: PaperTrail): string => {
  const lines = trail.lines.length
  const answered = answers(trail)
  const held = answered[0] ?? lines

  if (answered.length > 1) {
    return `${spellCapitalised(lines)} lines for the ${STEPS} steps above, because this change went through them twice: ${spell(held)} for the request your rules held, and ${spell(lines - held)} more for the same change put again after you said yes. The second answer is your rules being asked a second time rather than overruled.`
  }

  return trail.landed
    ? `${spellCapitalised(lines)} lines for the ${STEPS} steps above. The extra one is the rules themselves: which set was in force is written down before anything is worked out, so nobody has to work that out afterwards.`
    : `${spellCapitalised(lines)} lines for the ${STEPS} steps above, and no ${ordinal(lines + 1)}: the last one is the answer, and nothing follows it because nothing happened to the page. One of the ${spell(lines)} is the rules themselves, written down before anything was worked out.`
}

const paperTrail = (ids: IdFactory, trail: PaperTrail, theirs: boolean): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "The record itself" },
    theirs ? "Your change, as this site wrote it down" : "The same change, as this site wrote it down",
    [
      prose(ids, whoAsked(trail, theirs), { size: "lead", measured: true }),
      prose(ids, lineCount(trail), { tone: "muted", measured: true }),
      glossary(ids),
      ...trail.lines.flatMap((line, index) => stage(ids, line, index, theirs)),
    ]
  )

/**
 * The one this site will not do, and the only line of it that differs.
 *
 * A refused change reaches the same kinds of line as an allowed one — a request,
 * the rules, a list, a measurement — and then one answer that is not the same,
 * followed by nothing. Printing the verdict line on its own is not an economy:
 * the absence of the line after it is half of what this band is showing.
 *
 * **The heading and the sentence under it used to disagree**, and the disagreement
 * survived every check on this site: the heading said *the same five lines* and
 * the sentence three inches below it said *the first four lines read exactly as
 * they do above*. Four is the right number — the verdict is the line that
 * differs, so it is not one of the ones that match — and the heading was
 * counting the verdict among the things it is about to say is different.
 *
 * Both come off the refused run now, which is the only reason to trust either.
 */
const refusal = (ids: IdFactory, trail: PaperTrail): LoomNode => {
  /**
   * Where the two records stop matching, counted off **the refused run**.
   *
   * All three positions are facts about the record this band is printing: how
   * many kinds of line it reaches before the answer, which line the answer is,
   * and the one that is not there. They were read off `trail.lines` instead,
   * which gave the same three numbers for as long as the page above could only
   * ever be the six-line default — and would have made every one of them one too
   * small the first time a visitor arrived having asked for a change the rules
   * held. Two correct-looking sentences, never read next to each other.
   *
   * *Kinds* of line rather than the same lines. The run above is now whichever
   * one the visitor asked for, so its request, its list and its measurement are
   * its own; what is the same is that a refused change is measured and weighed
   * exactly as thoroughly as an allowed one before the answer differs.
   */
  const matching = trail.refusedLines - 1
  const verdict = trail.refusedLines
  const absent = trail.refusedLines + 1

  return section(
    ids,
    { width: "wide", eyebrow: "And when the answer is no" },
    `The same ${spell(matching)} kinds of line, and then a different answer`,
    [
      prose(
        ids,
        `The front page will not let anything take away the statement of what this site is for. Ask it to and it reaches the same ${spell(matching)} kinds of line as the run above — the request, the rules, the list, the measurement — and then this, its ${ordinal(verdict)}. There is no ${ordinal(absent)}, because nothing happened to the page.`,
        { measured: true }
      ),
      buildElement(ids, {
        type: "loom.code",
        props: {
          language: `${trail.refused.type}.json`,
          density: "compact",
          caption: "Nothing follows this line, because nothing happened to the page.",
        },
        children: [buildText(ids, trail.refused.json)],
      }),
      prose(
        ids,
        "Nobody typed that reason. It was counted off the change — what it destroys, how much of the page it reaches, and how deep it cuts — and the name of the rules that weighed it is on the line with it.",
        { tone: "muted", measured: true }
      ),
    ]
  )
}

const questions = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Questions" }, "About the mechanism", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "one" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens when the AI asks for something impossible?",
            answer:
              "It never reaches the page. Every piece it asks for is checked against what that kind of piece is allowed to hold, and a change that does not fit is refused whole rather than in part. A page is never left half-changed.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Does the page need the AI to be up in order to load?",
            answer:
              "No. The AI is involved once, when a change is being worked out, and never when a page is being shown. Drawing the page is plain, predictable code that talks to nothing — and anything it could not draw is reported rather than thrown, so one bad piece cannot take the page down.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can I use my own components?",
            answer:
              "That is the point. What the AI may use is a list you write, one per site — the ready-made set is a starting point and not a requirement.",
          },
        }),
      ],
    }),
  ])

/**
 * The foot of the page, and what a reader who has got this far wants next.
 *
 * It said *Read the decisions behind it* and offered the repository, then home.
 * Someone who has just read five steps of how a change travels has one obvious
 * next question — *show me one* — and until 22 August this site had nowhere to
 * send them: the demonstration lived at `/portal/demo`, behind a path that
 * reads as private, and nothing here linked to it. It is `/demo` now, public,
 * so the reader who wanted to see the five steps run can.
 *
 * "Back to the start" is what the demo replaced, and it was the weakest of the
 * three: home is the wordmark, a menu item marked as such, and a link in the
 * footer's map. A fourth way to a page nobody is looking for is not a use of
 * the last band on a page.
 */
const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "Now watch it happen to a real page", [
    prose(
      ids,
      `The ${STEPS} steps above are not a diagram of something that happens elsewhere. Ask a page to change and you can read every one of them, in order, as it runs.`,
      { tone: "muted", align: "center", measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
      action(ids, "Try it yourself", surfaceHref(context.origin, DEMO), {
        variant: "primary",
        scale: "large",
      }),
      action(ids, "The decision records", DECISIONS_URL, {
        variant: "secondary",
        scale: "large",
        external: true,
      }),
    ]),
  ], { align: "center" })

/**
 * What this page needs that the others do not: the run it is about to print.
 *
 * Optional for the same reason the front door's `record` is — the trail is a
 * *function of* the published front door, so the page has to be buildable
 * before there is one, and a request against a page that does not exist yet is
 * not a thing to arrange. `render.ts` is where the route always supplies it,
 * and `pages.test.ts` holds the served page to carrying it rather than leaving
 * that to whoever calls the builder next.
 */
export type MechanismContext = PageContext & {
  readonly trail?: PaperTrail
}

export const howItWorksPageTree = (context: MechanismContext): LoomTree => {
  const ids = sequentialIdFactory("how")
  const chrome: ChromeContext = { ...context, current: HOW_IT_WORKS }

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
        hero(ids),
        journey(ids),
        weighed(ids),
        record(ids),
        /**
         * The record, and — unless the record *is* one — the refusal beside it.
         *
         * `isRefusal` is the only thing that takes the contrast band away, and
         * it takes it away for the one visitor who does not need it: somebody
         * who asked the front door for the change this site refuses has the
         * refusal in front of them already, and a band captioned *and when the
         * answer is no* printing that same answer a second time reads as the
         * page having lost track of what it just said.
         *
         * **`theirs` is the trail agreeing with the address, not the address
         * alone.** A request that reached no answer falls back to the default
         * record, and a page that had greeted the reader as the person who made
         * *this* request would then be naming a request it is not printing.
         */
        ...(context.trail === undefined
          ? []
          : [
              paperTrail(ids, context.trail, context.trail.ask === context.ask),
              ...(context.trail.isRefusal ? [] : [refusal(ids, context.trail)]),
            ]),
        questions(ids),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
