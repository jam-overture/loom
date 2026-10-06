"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"

/**
 * A code block you can take away with you.
 *
 * The copy reads the rendered text rather than a prop, because the block has
 * been through a syntax highlighter by the time it gets here and the highlighted
 * markup is not the thing anyone wants on their clipboard. `textContent` is
 * exactly what was displayed, which is the only definition of "this snippet"
 * that cannot drift from what the reader is looking at.
 *
 * Two things about the button, both of which it got wrong until a test looked:
 *
 * **A browser is allowed to refuse the write.** A page served over plain http
 * has no `navigator.clipboard` at all; Safari refuses a write it does not
 * attribute to a gesture it recognises; a reader may have denied the permission.
 * Unguarded, the whole press came to nothing — no confirmation, no message, and
 * an unhandled rejection nobody but us would see — so the reader went and pasted
 * whatever had been on their clipboard before. There is no second way to copy, so
 * what the button owes them is the news: it says so, and they select the block
 * themselves.
 *
 * **The reveal is hidden where hovering is possible, not everywhere.** Tailwind 4
 * compiles every hover variant inside `@media (hover: hover)`, so a bare
 * `opacity-0` revealed by `group-hover` is a control that no phone or tablet can
 * ever show — while staying full-size, on top of the code, and clickable. The
 * hiding is now conditional on the device having a pointer that can hover, and
 * the two rules that reveal it beat that one on specificity rather than on source
 * order.
 */

/** What the button last said, and which press said it. */
type Answer = {
  readonly said: "nothing" | "copied" | "refused"
  /** Counted so that a second press restarts the clock the first one started. */
  readonly press: number
}

const WORD: Record<Answer["said"], string> = {
  nothing: "copy",
  copied: "copied",
  refused: "copy failed",
}

const SAID_FOR = 1600

/** Ask for the write, and report which of the two things happened. */
const writeToClipboard = async (text: string): Promise<Answer["said"]> => {
  try {
    await navigator.clipboard.writeText(text)

    return "copied"
  } catch {
    return "refused"
  }
}

export const CodeBlock = ({ children, className, ...rest }: ComponentProps<"pre">) => {
  const block = useRef<HTMLPreElement>(null)
  const [answer, setAnswer] = useState<Answer>({ said: "nothing", press: 0 })

  useEffect(() => {
    if (answer.said === "nothing") return

    const timer = window.setTimeout(() => setAnswer({ said: "nothing", press: answer.press }), SAID_FOR)

    return () => window.clearTimeout(timer)
  }, [answer])

  const copy = async (): Promise<void> => {
    const text = block.current?.textContent ?? ""

    if (text === "") return

    const said = await writeToClipboard(text)

    setAnswer((previous) => ({ said, press: previous.press + 1 }))
  }

  return (
    <div className="not-prose border-edge bg-code-surface group relative my-6 overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={copy}
        className="border-edge bg-surface-page text-ink-muted hover:text-ink absolute top-2 right-2 z-10 rounded-md border px-2 py-1 text-xs transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        {WORD[answer.said]}
      </button>

      <pre
        ref={block}
        className={`overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed ${className ?? ""}`}
        {...rest}
      >
        {children}
      </pre>
    </div>
  )
}
