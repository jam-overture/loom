import { describe, expect, it, vi } from "vitest"

import type { TreeId } from "../ids.js"

import {
  DEFAULT_READER_SIGNAL_PATH,
  deliverReaderSignals,
  type PostBatch,
  type SendBeacon,
} from "./deliver.js"
import type { ReaderSignalBatch, ViewKey } from "./signal.js"

const batch = {
  treeId: "t_page" as TreeId,
  revision: 3,
  sentAt: 1_700_000_000_000,
  view: "0123456789abcdef0123456789abcdef" as ViewKey,
  signals: [],
} as unknown as ReaderSignalBatch

describe("deliverReaderSignals", () => {
  it("posts the batch as JSON to the default path", async () => {
    const beacon = vi.fn<SendBeacon>(() => true)

    deliverReaderSignals({ beacon })(batch)

    expect(beacon).toHaveBeenCalledTimes(1)
    const [url, body] = beacon.mock.calls[0] ?? []
    expect(url).toBe(DEFAULT_READER_SIGNAL_PATH)
    expect(body?.type).toBe("application/json")
    expect(JSON.parse(await (body as Blob).text())).toEqual(JSON.parse(JSON.stringify(batch)))
  })

  it("sends to the url the host named", () => {
    const beacon = vi.fn<SendBeacon>(() => true)

    deliverReaderSignals({ url: "https://signals.example/in", beacon })(batch)

    expect(beacon.mock.calls[0]?.[0]).toBe("https://signals.example/in")
  })

  /** A beacon reports a refusal by returning false, which is easy to write past. */
  it("falls back to a post when the beacon will not take it", () => {
    const post = vi.fn<PostBatch>()

    deliverReaderSignals({ beacon: () => false, post })(batch)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]?.[0]).toBe(DEFAULT_READER_SIGNAL_PATH)
    expect(JSON.parse(String(post.mock.calls[0]?.[1]))).toMatchObject({ revision: 3 })
  })

  it("falls back to a post where there is no beacon at all", () => {
    const post = vi.fn<PostBatch>()

    deliverReaderSignals({ beacon: null, post })(batch)

    expect(post).toHaveBeenCalledTimes(1)
  })

  it("does not post when the beacon took it", () => {
    const post = vi.fn<PostBatch>()

    deliverReaderSignals({ beacon: () => true, post })(batch)

    expect(post).not.toHaveBeenCalled()
  })

  /** A sink observes and does not get a vote (0042) — including when it is broken. */
  it("contains a throwing beacon and still tries the fallback", () => {
    const post = vi.fn<PostBatch>()
    const send = deliverReaderSignals({
      beacon: () => {
        throw new Error("no")
      },
      post,
    })

    expect(() => send(batch)).not.toThrow()
  })

  it("contains a throwing post", () => {
    const send = deliverReaderSignals({
      beacon: null,
      post: () => {
        throw new Error("no")
      },
    })

    expect(() => send(batch)).not.toThrow()
  })

  /** The path is relative, so a delivery is same-origin unless a host says otherwise. */
  it("defaults to a same-origin path", () => {
    expect(DEFAULT_READER_SIGNAL_PATH.startsWith("/")).toBe(true)
    expect(URL.canParse(DEFAULT_READER_SIGNAL_PATH)).toBe(false)
  })
})
