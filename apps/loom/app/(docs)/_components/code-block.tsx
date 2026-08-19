"use client"

import { useRef, useState, type ComponentProps } from "react"

/**
 * A code block you can take away with you.
 *
 * The copy reads the rendered text rather than a prop, because the block has
 * been through a syntax highlighter by the time it gets here and the highlighted
 * markup is not the thing anyone wants on their clipboard. `textContent` is
 * exactly what was displayed, which is the only definition of "this snippet"
 * that cannot drift from what the reader is looking at.
 */
export const CodeBlock = ({ children, className, ...rest }: ComponentProps<"pre">) => {
  const block = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    const text = block.current?.textContent ?? ""

    if (text === "") return

    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="not-prose border-edge bg-code-surface group relative my-6 overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={copy}
        className="border-edge bg-surface-page text-ink-muted hover:text-ink absolute top-2 right-2 z-10 rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? "copied" : "copy"}
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
