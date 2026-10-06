import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CodeBlock } from "./code-block"

/**
 * Every fenced block on this site, and the one button on it.
 *
 * `mdx-components.tsx` maps `pre` to this, so there is no code block anywhere in
 * the documentation that is not this component — and nothing rendered it until
 * now. *Copy-paste code blocks* is one of the five things §4c names the site is
 * made of, which makes this the most-used control here and the least-held.
 *
 * Three of the tests below were red against the version that shipped, and they
 * are marked. The worst of them is not the copy failing: it is the copy failing
 * **silently**, which leaves a reader pasting whatever was on their clipboard
 * before and believing it is the snippet they pressed.
 */

/**
 * Press it and let the answer arrive.
 *
 * The handler asks the clipboard and waits, so the state it sets lands a
 * microtask later. Every test below settles rather than polling: `waitFor`
 * drives fake timers itself to decide when to give up, which on a component
 * whose whole subject is a timer reads as the component doing something it did
 * not do.
 */
const press = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button"))
  })
}

/** Let the clock run, as the reader does by looking away. */
const after = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const says = (): string => screen.getByRole("button").textContent ?? ""

const block = (text = "pnpm add @jam-overture/loom") => render(<CodeBlock>{text}</CodeBlock>)

/** A clipboard that works, and a record of what reached it. */
const clipboardThat = (writeText: (text: string) => Promise<void>) => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
}

/** A browser with no clipboard API at all, which is any page served over http. */
const noClipboard = (): void => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
}

const written: string[] = []

beforeEach(() => {
  written.length = 0
  clipboardThat(async (text) => {
    written.push(text)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("what reaches the clipboard", () => {
  it("is the text the reader is looking at, not the markup under it", async () => {
    render(
      <CodeBlock>
        <span className="token">pnpm</span> <span className="token">add</span> loom
      </CodeBlock>
    )

    await press()

    expect(written).toEqual(["pnpm add loom"])
  })

  it("is nothing at all from an empty block, which cannot be copied and does not claim to be", async () => {
    render(<CodeBlock>{""}</CodeBlock>)

    await press()

    expect(says()).toBe("copy")
    expect(written).toEqual([])
  })
})

describe("what the button says back", () => {
  it("confirms the copy, then goes quiet again", async () => {
    vi.useFakeTimers()
    block()

    await press()
    expect(says()).toBe("copied")

    await after(1700)

    expect(says()).toBe("copy")
  })

  /**
   * **Red before this branch.** The confirmation was cleared by a timer started
   * on the *first* press, so a reader who pressed twice — which is what a reader
   * does when they are not sure the first one took — saw "copied" vanish a few
   * hundred milliseconds after the second press. The signal that the button
   * works disappeared fastest for exactly the reader who doubted it.
   */
  it("starts the clock again on a second press rather than letting the first one end it", async () => {
    vi.useFakeTimers()
    block()

    await press()
    expect(says()).toBe("copied")

    await after(1200)
    await press()
    expect(written).toHaveLength(2)

    await after(600)

    expect(says()).toBe("copied")
  })

  it("says nothing after it has left the page, which is a timer it has to put down", async () => {
    vi.useFakeTimers()
    const { unmount } = block()

    await press()
    expect(says()).toBe("copied")
    unmount()

    expect(vi.getTimerCount()).toBe(0)
    await after(2000)
  })
})

/**
 * **Red before this branch, both of them.** `await navigator.clipboard.writeText`
 * was unguarded. A browser refuses that write in more ordinary situations than it
 * sounds: a page served over plain http, Safari outside a user gesture it
 * recognises, a reader who denied the permission. What happened then was nothing
 * — no confirmation, no message, an unhandled rejection in the console — and the
 * reader went and pasted.
 *
 * It cannot be fixed by copying some other way; there is no other way. What it
 * can do is say so, so the reader selects the block themselves.
 */
describe("a clipboard the browser will not let it write to", () => {
  it("says the copy failed rather than saying nothing", async () => {
    clipboardThat(async () => {
      throw new DOMException("Write permission denied.", "NotAllowedError")
    })
    block()

    await press()

    expect(says()).toBe("copy failed")
  })

  it("survives a browser with no clipboard to write to at all", async () => {
    noClipboard()
    block()

    await press()

    expect(says()).toBe("copy failed")
  })

  it("goes back to offering, so a second try is not blocked by the first failure", async () => {
    vi.useFakeTimers()
    clipboardThat(async () => {
      throw new DOMException("Write permission denied.", "NotAllowedError")
    })
    block()

    await press()
    expect(says()).toBe("copy failed")

    await after(1700)

    expect(says()).toBe("copy")
  })
})

/**
 * **Red before this branch, and the one a reader meets most.**
 *
 * The button was `opacity-0` with `group-hover:opacity-100` to reveal it, and
 * Tailwind 4 compiles every hover variant inside `@media (hover: hover)`. On a
 * phone or a tablet that media query is never true, so the reveal never
 * happened — while the button itself stayed in the layout at full size, on top
 * of the code, and perfectly clickable. A reader on a phone had an invisible
 * control over the first line of every code block on the site.
 *
 * Asserting it as a class name is not ideal and is the honest instrument
 * available: jsdom has no stylesheet, so the only thing a render test can hold
 * is that the hiding is **conditional on the device having hover**. The
 * compiled rule was checked against the Tailwind compiler on the run that wrote
 * this, and the specificity is what decides it rather than source order — the
 * gate is `0,1,0` and both reveals are `0,2,0`.
 */
describe("the button a reader has to be able to find", () => {
  it("is on the page before anybody hovers anything", () => {
    block()

    expect(screen.getByRole("button").textContent).toBe("copy")
  })

  it("is hidden only where the device has a pointer that can hover", () => {
    block()

    const classes = (screen.getByRole("button").getAttribute("class") ?? "").split(/\s+/)

    expect(classes).toContain("[@media(hover:hover)]:opacity-0")
    expect(classes).not.toContain("opacity-0")
  })

  it("comes back for a keyboard, which hovers nothing", () => {
    block()

    const classes = (screen.getByRole("button").getAttribute("class") ?? "").split(/\s+/)

    expect(classes).toContain("focus-visible:opacity-100")
    expect(classes).toContain("group-hover:opacity-100")
  })
})

describe("the block itself", () => {
  it("keeps the class the highlighter put on it, and the rest of what it was handed", () => {
    const { container } = render(
      <CodeBlock className="language-ts" data-line="4">
        const tree = …
      </CodeBlock>
    )
    const pre = container.querySelector("pre")

    expect(pre?.getAttribute("class")).toContain("language-ts")
    expect(pre?.getAttribute("data-line")).toBe("4")
  })

  it("is a scroller rather than a thing that widens the page", () => {
    const { container } = render(<CodeBlock>{"x".repeat(400)}</CodeBlock>)

    expect(container.querySelector("pre")?.getAttribute("class")).toContain("overflow-x-auto")
  })
})
