import { applyDelta, type JsonValue, type LoomTree, type RuntimeEventEnvelope } from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import { homePageTree } from "../pages/home"
import { RESERVED_VOCABULARY } from "../copy"

import { askById } from "./asks"
import { paperTrailFor, type PaperTrail } from "./paper-trail"
import { runAsk } from "./run"

/**
 * The band's only claim is that these lines are the run rather than a picture
 * of one, so that is what is tested: not that the page renders, but that what
 * it prints is byte-for-byte what a listener was handed, and that the change
 * printed on the last line really does put the page back.
 */

const frontDoor = (): LoomTree =>
  homePageTree({ origin: "https://loom.example", theme: "minimal" })

/**
 * Everything but the clock.
 *
 * Ids are drawn from a named factory and are the same on every run; the three
 * times are not, and they are the only fields two identical runs may differ in.
 * Blanking them by name rather than by shape is deliberate — a fourth timestamp
 * arriving somewhere new should fail this rather than be quietly tolerated.
 */
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

const parsed = (json: string): JsonValue => JSON.parse(json) as JsonValue

/** The same blanking, done to the printed text rather than to what it parses to. */
const withoutTimestamps = (json: string): string =>
  json.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "")

describe("the record the mechanism page prints", () => {
  let trail: PaperTrail

  beforeAll(async () => {
    trail = await paperTrailFor(frontDoor())
  })

  it("is the whole run, in the order the runtime said it", () => {
    expect(trail.lines.map((line) => line.type)).toEqual([
      "intent-received",
      "policy-resolved",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "change-applied",
    ])
  })

  /**
   * The fidelity test, and the reason the band is worth putting on a page.
   *
   * A listener is attached here, to the same ask through the same runner, and
   * what it hears is held against what the page prints. Nothing is allowed to
   * be summarised, reordered, pretty-printed differently or left out: the two
   * are the same objects with the same fields in the same order.
   */
  it("prints exactly what a listener attached to that run was handed", async () => {
    const heard: RuntimeEventEnvelope[] = []
    const ask = askById("calmer")

    expect(ask).toBeDefined()
    if (ask === undefined) return

    await runAsk(frontDoor(), ask, false, "shown", { emit: (envelope) => void heard.push(envelope) })

    expect(heard).toHaveLength(trail.lines.length)
    /**
     * Character for character, not field for field. A comparison of parsed
     * objects would pass a page that re-indented the lines, dropped a key
     * holding `undefined` or sorted them into a nicer order — all of which are
     * edits, and the band's whole claim is that nothing was edited.
     */
    expect(trail.lines.map((line) => withoutTimestamps(line.json))).toEqual(
      heard.map((envelope) => withoutTimestamps(JSON.stringify(envelope, null, 2)))
    )
  })

  it("says which page it is a record of, on every line", () => {
    for (const line of [...trail.lines, trail.refused]) {
      expect(parsed(line.json)).toMatchObject({ treeId: frontDoor().treeId })
    }
  })

  it("carries the request in the words the visitor's button stands for", () => {
    expect(trail.asked).toBe(askById("calmer")?.utterance)
    expect(trail.lines[0]?.json).toContain(trail.asked)
  })

  /**
   * The claim the last line makes, checked rather than printed and trusted.
   *
   * `change-applied` says the way back was kept. So the change it names is
   * applied to the page the run produced, and the result is held against the
   * page the run started from — which is the same assertion the front door's
   * own "put it back" rests on, made here about the JSON a reader can copy off
   * the screen rather than about a value passed between two functions.
   */
  it("prints a way back that really does put the page back", async () => {
    const ask = askById("calmer")

    expect(ask).toBeDefined()
    if (ask === undefined) return

    const started = frontDoor()
    const run = await runAsk(started, ask, false, "shown")
    const applied = trail.lines.find((line) => line.type === "change-applied")

    expect(applied).toBeDefined()
    if (applied === undefined) return

    const event = (parsed(applied.json) as { event: { inverse: unknown } }).event
    const back = applyDelta(run.page, event.inverse as never)

    expect(back.ok).toBe(true)
    if (!back.ok) return

    expect(withoutTimes(back.value.root as unknown as JsonValue)).toEqual(
      withoutTimes(started.root as unknown as JsonValue)
    )
  })

  describe("the refusal", () => {
    it("is the answer and nothing that would have followed it", () => {
      expect(trail.refused.type).toBe("disposition-decided")
      expect(parsed(trail.refused.json)).toMatchObject({
        event: {
          disposition: { kind: "rejected", policyId: "front-door", stakes: "critical" },
        },
      })
    })

    it("says which rules refused it and what the change would have destroyed", () => {
      expect(trail.refused.json).toContain("stakes-at-refusal-floor")
      expect(trail.refused.json).toContain("loom.nav")
    })
  })

  /**
   * The plain half stays plain.
   *
   * Every stage carries a title and a sentence a reader meets *before* the
   * line it introduces, and those are ours to write — so they are held to the
   * front door's standard rather than the mechanism page's. The lines
   * themselves are the runtime's and are exempt by construction: that is what
   * the glossary on the page is for.
   */
  it.each(RESERVED_VOCABULARY)("explains each stage without saying %s", (term) => {
    const written = [...trail.lines, trail.refused]
      .flatMap((line) => [line.title, line.plainly, line.caption ?? ""])
      .join(" ")

    expect(new RegExp(`\\b${term}s?\\b`, "i").test(written)).toBe(false)
  })

  it("is the same record twice, because the front door is a function of nothing", async () => {
    const again = await paperTrailFor(frontDoor())

    expect(again.lines.map((line) => withoutTimes(parsed(line.json)))).toEqual(
      trail.lines.map((line) => withoutTimes(parsed(line.json)))
    )
  })
})
