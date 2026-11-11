import { err, ok, type Result } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { rememberedFor } from "./remembered"

const counting = (answers: readonly Result<string, string>[]) => {
  let reads = 0

  return {
    reads: () => reads,
    read: (_argument: string): Promise<Result<string, string>> => {
      const answer = answers[Math.min(reads, answers.length - 1)] ?? err("no answer")

      reads += 1

      return Promise.resolve(answer)
    },
  }
}

describe("rememberedFor", () => {
  it("answers from what it holds inside the window, without reading again", async () => {
    let clock = 0
    const source = counting([ok("first"), ok("second")])
    const read = rememberedFor(60_000, source.read, String, () => clock)

    await read("a")
    clock = 59_999

    expect({ answer: await read("a"), reads: source.reads() }).toEqual({
      answer: ok("first"),
      reads: 1,
    })
  })

  it("reads again once the window has passed", async () => {
    let clock = 0
    const source = counting([ok("first"), ok("second")])
    const read = rememberedFor(60_000, source.read, String, () => clock)

    await read("a")
    clock = 60_000

    expect(await read("a")).toEqual(ok("second"))
  })

  it("shares a read that is still in flight rather than starting a second", async () => {
    const source = counting([ok("only")])
    const read = rememberedFor(60_000, source.read, String, () => 0)

    await Promise.all([read("a"), read("a"), read("a")])

    expect(source.reads()).toBe(1)
  })

  it("keeps each argument's answer apart", async () => {
    const source = counting([ok("for a"), ok("for b")])
    const read = rememberedFor(60_000, source.read, String, () => 0)

    expect([await read("a"), await read("b")]).toEqual([ok("for a"), ok("for b")])
  })

  it("does not keep a refusal, so a brief outage switches nothing off for the window", async () => {
    const source = counting([err("unavailable"), ok("back")])
    const read = rememberedFor(60_000, source.read, String, () => 0)

    await read("a")
    await Promise.resolve()

    expect(await read("a")).toEqual(ok("back"))
  })
})
