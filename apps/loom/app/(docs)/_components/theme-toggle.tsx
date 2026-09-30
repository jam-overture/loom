"use client"

import { useEffect, useState } from "react"

import { THEME_STORAGE_KEY } from "@/app/(docs)/_lib/theme"

/**
 * Light and dark, chosen or inherited.
 *
 * Three states, not two: `system` is the default and follows the operating
 * system, and picking `light` or `dark` is a decision the reader made that
 * survives a reload. Collapsing that to a boolean loses the difference between
 * "I want light" and "my machine is light this morning".
 *
 * The attribute this writes is set before paint by the inline script in the
 * root layout, so nothing here runs during first render. Reading it in an
 * effect rather than at render is what keeps the server and client markup
 * identical — a toggle that hydrated with the wrong label would flash the wrong
 * answer at exactly the reader who chose otherwise.
 */

type Choice = "light" | "dark" | "system"

const NEXT: Record<Choice, Choice> = { system: "light", light: "dark", dark: "system" }
const LABEL: Record<Choice, string> = { system: "System", light: "Light", dark: "Dark" }
const GLYPH: Record<Choice, string> = { system: "◐", light: "☀", dark: "☾" }

const applied = (choice: Choice): "light" | "dark" =>
  choice !== "system"
    ? choice
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"

export const ThemeToggle = () => {
  const [choice, setChoice] = useState<Choice>("system")

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)

    if (stored === "light" || stored === "dark") setChoice(stored)
  }, [])

  const choose = (next: Choice): void => {
    setChoice(next)

    if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, next)

    document.documentElement.dataset["theme"] = applied(next)
  }

  return (
    <button
      type="button"
      onClick={() => choose(NEXT[choice])}
      aria-label={`Color theme: ${LABEL[choice]}. Switch to ${LABEL[NEXT[choice]]}.`}
      title={`Theme: ${LABEL[choice]}`}
      className="border-edge text-ink-muted hover:text-ink hover:border-edge-strong flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors"
    >
      <span aria-hidden>{GLYPH[choice]}</span>
    </button>
  )
}
