import type { ElementNode, JsonValue, LoomNode, RuntimeEventEnvelope } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { ASKS, askById, readAskId, type AskId } from "../adapt/asks"
import { DEFAULT_SHOWN, paperTrailFor, REFUSED } from "../adapt/paper-trail"
import { runAsk } from "../adapt/run"
import { askRunFor, pageTreeFor, renderTree, treeFor } from "../render"
import { HOME, HOW_IT_WORKS } from "../site"

/**
 * The mechanism page prints the record of the request the visitor made.
 *
 * Until this run it printed the record of one request — the quietest of the
 * five, chosen when that page was written — whoever arrived and whatever they
 * had just done. A visitor who watched *Prove it* add a band to the front door
 * and clicked through to read the record was handed the record of *Turn it
 * down*, and nothing on either page said so.
 *
 * That is a hard failure to catch by looking, which is why it survived: both
 * pages were correct, the record was real, the lines were genuinely the run's,
 * and the only thing wrong was that it was a run of something else. So the
 * assertions here are all of one shape — **the record shown is the record of
 * the request named**, held against a listener attached to that same request
 * rather than against expected copy.
 */

const ORIGIN = "https://loom.example"
const THEME = "minimal" as const

const front = () => treeFor(HOME, { origin: ORIGIN, theme: THEME })

/** Ids are stable across runs; the three timestamps are the only fields that are not. */
const TIMES = ["occurredAt", "observedAt", "interpretedAt"]

const withoutTimes = (value: JsonValue): JsonValue =>
  Array.isArray(value)
    ? value.map(withoutTimes)
    : typeof value === "object" && value !== null
      ? Object.fromEntries(
          Object.entries(value).map(([key, held]) => [
            key,
            TIMES.includes(key) ? "" : withoutTimes(held as JsonValue),
          ])
        )
      : value

const withoutTimestamps = (json: string): string =>
  json.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "")

const parsed = (json: string): JsonValue => JSON.parse(json) as JsonValue

const words = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(words).join(" ")

const descendants = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "text" ? [node] : [node, ...node.children.flatMap(descendants)]

const elements = (node: LoomNode): readonly ElementNode[] =>
  descendants(node).flatMap((child) => (child.kind === "element" ? [child] : []))

const eyebrowsOf = (root: LoomNode): readonly string[] =>
  root.kind === "text"
    ? []
    : root.children.flatMap((child) =>
        child.kind === "element" && typeof child.props["eyebrow"] === "string"
          ? [child.props["eyebrow"]]
          : []
      )

const panelCount = (root: LoomNode): number =>
  elements(root).filter((node) => node.type === "loom.code").length

const ALL: readonly AskId[] = ASKS.map((ask) => ask.id)

/** The one the rules hold for a person rather than allowing or refusing. */
const HELD: AskId = "problem"

/**
 * The panel's word for a verdict, against the machinery's word for it.
 *
 * Two vocabularies on purpose: the page says *refused* where the line says
 * `rejected`, because one is written for a stranger and the other for a log.
 * They are pinned to each other here because a visitor following the link is
 * doing exactly this comparison by eye, and the panel claiming one answer over
 * a line that says another is the site failing at its only real claim.
 *
 * **`approved` maps to `requires-confirmation` and that is not a mistake.** The
 * rules held the change and said so; the visitor allowing it afterwards is the
 * next step rather than a different answer, and the line that records the
 * answer is not rewritten when they say yes. That is the property the whole
 * record rests on — nothing already written down is edited later.
 */
const DISPOSITION_FOR: Readonly<Record<string, string>> = {
  landed: "accepted",
  held: "requires-confirmation",
  approved: "requires-confirmation",
  refused: "rejected",
}

describe("the record the mechanism page prints, for the request that was made", () => {
  describe.each(ALL)("%s", (id) => {
    it("is the record of that request and of no other", async () => {
      const trail = await paperTrailFor(front(), id)
      const asked = askById(id)?.utterance

      expect(asked).toBeDefined()
      expect(trail.ask).toBe(id)
      expect(trail.asked).toBe(asked)
      expect(trail.lines[0]?.json).toContain(asked)

      /**
       * And not of another. The utterances are five different sentences, so a
       * page that ignored the parameter and printed the default would pass
       * every assertion above for `calmer` and fail this one for the other
       * four — which is precisely the bug this file exists for.
       */
      for (const other of ASKS.filter((ask) => ask.id !== id)) {
        expect(trail.lines[0]?.json).not.toContain(other.utterance)
      }
    })

    /**
     * The fidelity claim, made for every choice rather than for one.
     *
     * A listener is attached here, to the same request through the same runner,
     * and what it hears is held against what the page prints — character for
     * character. A comparison of parsed objects would pass a page that
     * re-indented, reordered or dropped a key, and the band's whole claim is
     * that nothing was edited.
     */
    it("prints exactly what a listener attached to that run was handed", async () => {
      const ask = askById(id)

      expect(ask).toBeDefined()
      if (ask === undefined) return

      const heard: RuntimeEventEnvelope[] = []

      await runAsk(front(), ask, false, "shown", { emit: (envelope) => void heard.push(envelope) })

      const trail = await paperTrailFor(front(), id)

      expect(heard).toHaveLength(trail.lines.length)
      expect(trail.lines.map((line) => withoutTimestamps(line.json))).toEqual(
        heard.map((envelope) => withoutTimestamps(JSON.stringify(envelope, null, 2)))
      )
    })

    it("reaches an answer, and says whether anything followed it", async () => {
      const trail = await paperTrailFor(front(), id)

      expect(trail.lines.map((line) => line.type)).toContain("disposition-decided")
      expect(trail.landed).toBe(trail.lines.some((line) => line.type === "change-applied"))
      expect(trail.isRefusal).toBe(id === REFUSED)
    })

    /**
     * The assertion this whole run is for.
     *
     * The front door's panel tells the visitor in words what their rules
     * decided; the mechanism page prints the line the machinery wrote. A
     * visitor who follows the link is checking the second against the first,
     * and the two disagreeing is the site failing at the one claim it is
     * making — so the two are held against each other here, where a screenshot
     * review could never catch it because they are never on one screen.
     */
    it("agrees with the verdict the front door's panel showed for it", async () => {
      const run = await askRunFor({ origin: ORIGIN, theme: THEME, ask: id })

      expect(run).toBeDefined()
      if (run === undefined) return

      const trail = await paperTrailFor(front(), id)

      expect(trail.asked).toBe(run.record.asked)
      expect(trail.landed).toBe(run.record.landed)

      const answer = trail.lines.find((line) => line.type === "disposition-decided")

      expect(answer).toBeDefined()
      expect(parsed(answer?.json ?? "{}")).toMatchObject({
        event: { disposition: { kind: DISPOSITION_FOR[run.record.verdict] } },
      })
    })
  })

  /**
   * The default is untouched, which is what makes this change additive.
   *
   * `/how-it-works` with nothing in its address is the page it has been since
   * it was written, and that is the page every crawler and every share preview
   * of it gets. Held against the named default rather than against `calmer`
   * spelled a second time here.
   */
  it("is the request it has always been when nobody asked for another", async () => {
    const bare = await paperTrailFor(front())
    const named = await paperTrailFor(front(), DEFAULT_SHOWN)

    expect(bare.ask).toBe(DEFAULT_SHOWN)
    expect(bare.landed).toBe(true)
    expect(bare.lines.map((line) => withoutTimes(parsed(line.json)))).toEqual(
      named.lines.map((line) => withoutTimes(parsed(line.json)))
    )
  })

  /**
   * A held change gains a line when the visitor allows it, and the page has to
   * gain it too.
   *
   * This is the one state where the record on the mechanism page is a function
   * of something other than which button was pressed. A link that dropped the
   * approval would open a page one line shorter than the panel it was followed
   * from — the visitor having just been told their change landed, and the raw
   * record showing it stopping at the answer.
   */
  describe("a change the rules held", () => {
    it("stops at the answer until the visitor allows it", async () => {
      const trail = await paperTrailFor(front(), HELD, false)

      expect(trail.landed).toBe(false)
      expect(trail.lines.map((line) => line.type)).not.toContain("change-applied")
    })

    it("reaches the page once they have", async () => {
      const trail = await paperTrailFor(front(), HELD, true)

      expect(trail.landed).toBe(true)
      expect(trail.lines.map((line) => line.type)).toContain("change-applied")
    })
  })
})

describe("the mechanism page, as the route serves it", () => {
  const served = async (ask?: AskId, approve = false) =>
    pageTreeFor(HOW_IT_WORKS, {
      origin: ORIGIN,
      theme: THEME,
      ...(ask === undefined ? {} : { ask, approve }),
    })

  describe.each(ALL)("asked for %s", (id) => {
    it("prints that request's words on the page", async () => {
      const tree = await served(id)
      const asked = askById(id)?.utterance

      expect(asked).toBeDefined()
      if (asked === undefined) return

      expect(words(tree.root)).toContain(asked)
    })

    it("renders with nothing the runtime could not honour, and names no colour", async () => {
      const rendered = renderTree(await served(id))

      expect(rendered.diagnostics).toEqual([])
    })

    /**
     * One panel per line of the run, plus the contrast unless the run is it.
     *
     * Counted rather than looked for. A stage the page stopped printing shows
     * up as a slightly shorter page and nothing else, and the number is the
     * only thing that catches it.
     */
    it("prints one panel per line, and the refusal beside it unless it is one", async () => {
      const tree = await served(id)
      const trail = await paperTrailFor(front(), id)

      expect(panelCount(tree.root)).toBe(trail.lines.length + (id === REFUSED ? 0 : 1))
    })

    /**
     * The sentence that counts the lines, held against the lines.
     *
     * It said *"Six lines"* while the page could only print one request, and
     * three of the five stop at five. A page that printed five panels under a
     * sentence promising six would be this site failing at arithmetic in front
     * of a reader who can count.
     */
    it("says how many lines there are, and is right", async () => {
      const tree = await served(id)
      const trail = await paperTrailFor(front(), id)
      const written = words(tree.root)

      expect(written).toContain(trail.landed ? "Six lines" : "Five lines")
      expect(written).not.toContain(trail.landed ? "Five lines" : "Six lines")
    })
  })

  it("leaves out the contrast band only for the request that is itself refused", async () => {
    for (const id of ALL) {
      const eyebrows = eyebrowsOf((await served(id)).root)

      expect(eyebrows).toContain("The record itself")
      expect(eyebrows.includes("And when the answer is no")).toBe(id !== REFUSED)
    }
  })

  it("tells a visitor who asked that it was theirs, and anybody else that it was not", async () => {
    expect(words((await served()).root)).toContain("A moment ago somebody asked")
    expect(words((await served("proof")).root)).toContain("You have just asked")
  })

  /**
   * And says it the same way twice on the one page.
   *
   * The lead sentence and the first stage's title are eight hundred pixels
   * apart and are the only two places this page names whoever asked. Saying
   * *you* in one and *somebody* in the other is the kind of near-miss that
   * survives review because both halves are defensible on their own — and the
   * front door's panel, which this reader has just come from, says *you*.
   */
  it("does not call the visitor somebody else further down the same page", async () => {
    expect(words((await served("proof")).root)).toContain("You asked for something")
    expect(words((await served("proof")).root)).not.toContain("Somebody asked for something")
    expect(words((await served()).root)).toContain("Somebody asked for something")
  })
})

describe("the address the front door hands over", () => {
  const mechanismLinks = async (ask?: AskId, approve = false): Promise<readonly string[]> => {
    const page = await pageTreeFor(HOME, {
      origin: ORIGIN,
      theme: THEME,
      ...(ask === undefined ? {} : { ask, approve }),
    })

    return elements(page.root)
      .filter((node) => node.type === "loom.action")
      .map((node) => node.props["href"])
      .filter((href): href is string => typeof href === "string")
      .filter((href) => new URL(href).pathname === HOW_IT_WORKS.path)
  }

  /**
   * The panel's link, and only it.
   *
   * The front door points at the mechanism page from three places — the hero's
   * first call to action, the menu, and the closing band — and all three are
   * bare on purpose. The one this run added is the only one that carries a
   * request, so carrying a request is what identifies it; a test that took the
   * first link on the page would have been reading the hero's.
   */
  const panelLinks = async (ask: AskId, approve = false): Promise<readonly string[]> =>
    (await mechanismLinks(ask, approve)).filter(
      (href) => new URL(href).searchParams.get("ask") !== null
    )

  describe.each(ALL)("after asking for %s", (id) => {
    it("points at the mechanism page carrying that same request", async () => {
      const links = await panelLinks(id)

      expect(links).toHaveLength(1)
      expect(readAskId(new URL(links[0] ?? "").searchParams.get("ask") ?? undefined)).toBe(id)
    })

    /**
     * Followed rather than inspected.
     *
     * The address is read back through `readAskId` — the same reader the route
     * uses — and the record it produces is held against the record the visitor
     * was just shown. An address that was well-formed and pointed at the wrong
     * request would pass a check on its shape and fail this one.
     */
    it("replays to the record the visitor was just shown", async () => {
      const links = await panelLinks(id)
      const address = new URL(links[0] ?? "")
      const replayed = await paperTrailFor(
        front(),
        readAskId(address.searchParams.get("ask") ?? undefined),
        address.searchParams.get("approve") === "1"
      )
      const run = await askRunFor({ origin: ORIGIN, theme: THEME, ask: id })

      expect(run).toBeDefined()
      expect(replayed.asked).toBe(run?.record.asked)
      expect(replayed.landed).toBe(run?.record.landed)
    })
  })

  it("carries the approval, so an allowed change does not replay as a held one", async () => {
    const held = new URL((await panelLinks(HELD, false))[0] ?? "")
    const allowed = new URL((await panelLinks(HELD, true))[0] ?? "")

    expect(held.searchParams.get("approve")).toBeNull()
    expect(allowed.searchParams.get("approve")).toBe("1")
  })

  /**
   * The arrival page hands over nothing, and the other three links stay bare.
   *
   * A menu item or a hero button carrying somebody's request would put the
   * record of a change nobody made on every page of the site — and would be
   * indexed that way, since `/` is what a crawler and a share preview get.
   */
  it("is not offered before the visitor has asked for anything", async () => {
    const bare = await mechanismLinks()

    expect(bare.length).toBeGreaterThan(0)
    for (const href of bare) {
      expect(new URL(href).searchParams.get("ask")).toBeNull()
    }
  })

  it("leaves the page's other links to the mechanism page alone", async () => {
    for (const id of ALL) {
      const carrying = (await mechanismLinks(id)).filter(
        (href) => new URL(href).searchParams.get("ask") !== null
      )

      expect(carrying).toHaveLength(1)
      expect((await mechanismLinks(id)).length).toBe((await mechanismLinks()).length + 1)
    }
  })
})
