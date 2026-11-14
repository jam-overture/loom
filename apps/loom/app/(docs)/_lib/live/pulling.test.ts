import { describe, expect, it } from "vitest"

import {
  baseBandCount,
  DOCS_PULL_CEILING_MS,
  produceArrival,
  produceFailures,
  produceFirstReader,
  produceReaders,
  produceTimings,
  type Failure,
} from "./pulling"

/**
 * What *How a change reaches readers* prints, held against the runtime that
 * printed it.
 *
 * The page makes four claims a reader acts on, and each of them is a case here
 * rather than a sentence somebody checked once:
 *
 * - **A failed pull costs freshness, never the page** (0358 clause 4). Five
 *   ways to fail, and the page served in all five.
 * - **Loom never learns who a reader is** (0262, 0371 clause 2). The address
 *   the client asks carries no query, no fragment and nothing about anybody.
 * - **A form that cannot be applied costs the reader their segment, not their
 *   page.** The third reader keeps the page and loses the audience.
 * - **Only the first render waits.** One pull before it, none added by the one
 *   after it.
 *
 * The failure vocabulary is checked for **exhaustiveness at the type level**
 * rather than against a list typed here. There is no published array of
 * reasons — `SitePullFailure["reason"]` is a union — so a sixth reason would
 * leave this suite green and the page a reason short. The `Record` below is
 * what fails to compile instead.
 */

type Reason = Failure["reason"]

const reasonsOf = (failures: readonly Failure[]): readonly string[] =>
  failures.map((failure) => failure.reason)

describe("what one pull brings back", () => {
  it("asks an address that names no reader and carries no query", async () => {
    const arrival = await produceArrival()
    const url = new URL(arrival.url)

    expect(url.search).toBe("")
    expect(url.hash).toBe("")
    expect(url.pathname.endsWith(arrival.path)).toBe(true)
  })

  /**
   * The three counts are the shape of the answer, and they are read off what
   * the server holds rather than off the JSON the door was handed. A page, its
   * rules and its form arriving as three independent numbers is what 0371
   * clause 4 is about, so the page prints three numbers rather than one.
   */
  it("holds the page, its segment rules and its segment form, from one answer", async () => {
    const arrival = await produceArrival()

    expect(arrival.kind).toBe("fresh")
    expect(arrival.pages).toBe(1)
    expect(arrival.rules).toBe(1)
    expect(arrival.forms).toBe(1)
    expect(arrival.pulling).toBe(true)
  })

  /** The tag is what makes the next pull free, so a door that gave one is shown giving one. */
  it("shows the tag the door gave", async () => {
    expect((await produceArrival()).tag).not.toBe("none")
  })
})

describe("a failed pull costs freshness and never the page", () => {
  /**
   * The case the page exists for.
   *
   * Every row, not most of them: if one way of failing ever did cost the page,
   * the page's central claim would be false and the table would be showing it
   * while the prose denied it.
   */
  it("serves the page in every way a pull can fail", async () => {
    const failures = await produceFailures()

    expect(failures).not.toHaveLength(0)

    for (const failure of failures) {
      expect(failure.served, failure.reason).toBe(true)
      expect(failure.held, failure.reason).toBe(0)
    }
  })

  /**
   * Every reason the client can give is on the page.
   *
   * The `Record` is the whole check. It is not read at runtime and it does not
   * need to be: a sixth member of the union leaves a missing key here and the
   * build names the file. The `expect` under it is what fails if a reason is
   * in the type and the producer stopped producing it.
   */
  it("shows every reason the client can give", async () => {
    const shown = reasonsOf(await produceFailures())

    const everyReason: Record<Reason, true> = {
      unconfigured: true,
      unreachable: true,
      expired: true,
      refused: true,
      unreadable: true,
    }

    for (const reason of Object.keys(everyReason)) {
      expect(shown, `${reason} is in the type and not on the page`).toContain(reason)
    }

    expect(new Set(shown).size, "a reason is shown twice").toBe(shown.length)
  })

  /**
   * The sentences are the runtime's.
   *
   * `describeSitePullFailure` prefixes every one of them, so a page that had
   * started typing its own sentences would fail here rather than drift. The
   * reason appears inside its own sentence for the same purpose: a sentence
   * lifted from the wrong failure would pass a prefix check and fail this.
   */
  it("prints the sentence the runtime returned, and not one of its own", async () => {
    for (const failure of await produceFailures()) {
      expect(failure.sentence.startsWith("live pages were not pulled ("), failure.reason).toBe(true)
      expect(failure.sentence, failure.reason).toContain(`(${failure.reason})`)
    }
  })

  /** The two failures a door answers with a status say which, and the other three say none. */
  it("names the status where the door gave one", async () => {
    const byReason = new Map((await produceFailures()).map((f) => [f.reason, f.status] as const))

    expect(byReason.get("refused")).toBe("401")
    expect(byReason.get("unreadable")).toBe("200")
    expect(byReason.get("unreachable")).toBe("none")
  })

  /**
   * The ceiling this file chose is small, and the page says both numbers.
   *
   * A reader comparing *no answer in 5ms* against a deployment's ten seconds
   * deserves to be told which of the two the table waited, which is the same
   * bargain *When nothing comes back* makes.
   */
  it("waited the documentation ceiling and prints the deployment's beside it", async () => {
    const expired = (await produceFailures()).find((failure) => failure.reason === "expired")
    const timings = produceTimings()

    expect(expired?.sentence).toContain(`${DOCS_PULL_CEILING_MS}ms`)
    expect(timings.docs).not.toBe(timings.ceiling)
    expect(timings.ceiling).not.toBe("")
  })
})

describe("one page, three readers", () => {
  it("serves the segment's form to the reader the rule matches", async () => {
    const [returning] = await produceReaders()

    expect(returning?.segment).toBe("aud_returning")
    expect(returning?.formApplied).toBe(true)
    expect(returning?.bands).toBe(baseBandCount() + 1)
    expect(returning?.refusal).toBe("none")
  })

  it("serves the base to a reader no rule matches, and files them under nobody", async () => {
    const first = (await produceReaders())[1]

    expect(first?.segment).toBe("none")
    expect(first?.formApplied).toBe(false)
    expect(first?.bands).toBe(baseBandCount())
    expect(first?.refusal).toBe("none")
  })

  /**
   * The row the page asks a reader to look at twice.
   *
   * Three things have to be true at once for the argument to hold, so all
   * three are asserted: the page is still there, the form is not on it, and
   * the audience is gone. A refusal that kept the audience would make every
   * later comparison between two segments a comparison between one segment's
   * form and another segment's name over the base.
   */
  it("costs a stale form its segment and not its page", async () => {
    const stale = (await produceReaders())[2]

    expect(stale?.bands).toBe(baseBandCount())
    expect(stale?.formApplied).toBe(false)
    expect(stale?.segment).toBe("none")
    expect(stale?.refusal).toContain("aud_returning")
    expect(stale?.refusal).toContain("revision")
  })

  /** Every reader's context is the host's own, so none of them names an audience. */
  it("sorts on keys a host would have, and never on one Loom supplied", async () => {
    for (const reader of await produceReaders()) {
      const context: unknown = JSON.parse(reader.context)

      expect(Object.keys(context as Record<string, unknown>)).toEqual(["returning", "device"])
    }
  })
})

describe("only the first render waits", () => {
  it("pulls once before the first render and not again for the second", async () => {
    const first = await produceFirstReader()

    expect(first.pullsAtFirstRender).toBe(1)
    expect(first.firstRenderWasLive).toBe(true)
    expect(first.pullsAtSecondRender).toBe(1)
    expect(first.secondRenderAskedTheDoor).toBe(false)
  })
})

describe("the waits a deployment gets", () => {
  /**
   * Read off the runtime's constants and spelled by the runtime's own
   * function, so that this page and *When nothing comes back* cannot come to
   * disagree about what a duration is called.
   */
  it("prints a spelling for each of the three, none of them empty", () => {
    const timings = produceTimings()

    for (const [name, value] of Object.entries(timings)) {
      expect(value, name).not.toBe("")
      expect(value, name).toMatch(/^\d/)
    }
  })
})
