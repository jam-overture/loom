"use client"

import { useEffect, useState } from "react"

/**
 * A button that puts one string on the clipboard, and says whether it did.
 *
 * The docs' code block learned the hard way that **a browser may refuse the
 * write** — plain http has no clipboard at all, Safari refuses a write it does
 * not attribute to a gesture, and a reader may have denied it — and that a
 * button which came to nothing sends somebody off to paste whatever was there
 * before. Here that would be an old key or no snippet at all, so the refusal
 * is said out loud and the value stays on screen to be selected by hand.
 *
 * It takes the text rather than reading the page, because what is shown and
 * what is copied are the same string handed down from one place.
 */

type Said = "nothing" | "copied" | "refused"

const WORD: Readonly<Record<Said, string>> = {
  nothing: "Copy",
  copied: "Copied",
  refused: "Copy failed — select it instead",
}

const SAID_FOR = 1600

export const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [said, setSaid] = useState<Said>("nothing")

  useEffect(() => {
    if (said === "nothing") return

    const timer = window.setTimeout(() => setSaid("nothing"), SAID_FOR)

    return () => window.clearTimeout(timer)
  }, [said])

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setSaid("copied")
    } catch {
      setSaid("refused")
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={said === "nothing" ? label : undefined}
      aria-live="polite"
      className="border-edge hover:bg-surface-hover shrink-0 rounded-md border px-2 py-1.5 text-xs"
    >
      {WORD[said]}
    </button>
  )
}
