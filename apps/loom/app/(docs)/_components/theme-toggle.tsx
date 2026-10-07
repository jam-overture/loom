"use client"

import { useEffect, useState } from "react"

import { SITE_BAR, THEME_COLOR_NAME, THEME_STORAGE_KEY } from "@/app/(docs)/_lib/theme"

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
 *
 * Two things it has to do that are easy to leave out, and both were:
 *
 * **While `system` is the choice, the machine may change its mind.** Resolving
 * the preference once at load is right for the inline script, which runs once;
 * for a page the reader keeps open it means `system` is really "whatever the
 * system was when I arrived", and a reader whose machine goes dark at sunset
 * keeps a light page. So the query is subscribed to for as long as `system` is
 * the choice, and only then — a reader who has chosen light is not asking to be
 * overruled at sunset.
 *
 * **Storage is a thing a reader is allowed to turn off.** `window.localStorage`
 * does not return `null` where site data is blocked, it *throws* on access. The
 * inline script has always had a `try` around it. This did not, and the read sat
 * in an effect, so the failure was not a toggle that did nothing: it was an
 * exception on the way to the route's error boundary, and every page of this
 * site became an error screen for that reader. The theme they asked for now
 * works and simply is not remembered, which is the most any page can offer
 * somewhere it may not write.
 *
 * **And the page is not the only thing a press repaints.** The strip of browser
 * above the page is told its color by a `<meta name="theme-color">` the layout
 * renders, which the inline script corrects before paint; a press has to move
 * it too, or the bar keeps whatever the reader arrived with and the toggle
 * works everywhere except the one part of the screen that is not the page.
 * Both live in `paint` rather than in the click handler, which is what makes
 * the sunset case right as well: a machine changing its mind under `system`
 * goes through the same function.
 */

type Choice = "light" | "dark" | "system"

const NEXT: Record<Choice, Choice> = { system: "light", light: "dark", dark: "system" }
const LABEL: Record<Choice, string> = { system: "System", light: "Light", dark: "Dark" }
const GLYPH: Record<Choice, string> = { system: "◐", light: "☀", dark: "☾" }

const DARK_QUERY = "(prefers-color-scheme: dark)"

/** What the reader chose last time, or `system` — including where asking throws. */
const remembered = (): Choice => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)

    return stored === "light" || stored === "dark" ? stored : "system"
  } catch {
    return "system"
  }
}

/** Keep the choice if we are allowed to. A reader who blocked storage is not. */
const remember = (choice: Choice): void => {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    return
  }
}

const applied = (choice: Choice): "light" | "dark" =>
  choice !== "system" ? choice : window.matchMedia(DARK_QUERY).matches ? "dark" : "light"

/**
 * The two things a theme is, applied together.
 *
 * The meta is looked up on every call rather than held, because this runs in a
 * client component and the element belongs to the document the layout rendered.
 * A missing one is left alone rather than created: the layout always emits it,
 * so absent means something upstream changed, and a bar invented here would
 * hide that instead of letting it show.
 */
const paint = (choice: Choice): void => {
  const resolved = applied(choice)

  document.documentElement.dataset["theme"] = resolved
  document.querySelector(`meta[name="${THEME_COLOR_NAME}"]`)?.setAttribute("content", SITE_BAR[resolved])
}

export const ThemeToggle = () => {
  const [choice, setChoice] = useState<Choice>("system")

  useEffect(() => {
    setChoice(remembered())
  }, [])

  useEffect(() => {
    if (choice !== "system") return

    const query = window.matchMedia(DARK_QUERY)
    const follow = (): void => paint("system")

    query.addEventListener("change", follow)

    return () => query.removeEventListener("change", follow)
  }, [choice])

  const choose = (next: Choice): void => {
    setChoice(next)
    remember(next)
    paint(next)
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
