"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react"
import { flushSync } from "react-dom"

import { movedTo, searchAnswer } from "@/app/(portal)/_lib/feature-search"
import { projectInAddress } from "@/app/(portal)/_lib/project-name"

/** Whether a key pressed there is typing, so `/` is a character and not a way to the search. */
const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

/** `/` anywhere a person is not typing takes them to the search, as it does on most sites. */
const useSlashToSearch = (input: RefObject<HTMLInputElement | null>, reveal: () => void) => {
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return

      event.preventDefault()
      reveal()
      input.current?.focus()
    }

    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [input, reveal])
}

/**
 * The top bar's search: the portal's own screens and what they let a person do,
 * by plain words (`docs/portal-wireframes.md`, *The chrome*; the maintainer, 11
 * November). A list opens under the box as a person types, the best answer
 * first; the arrow keys move through it, Enter opens the one marked, Escape
 * empties the box. Moving to another screen empties it too, so the box never
 * holds a question already answered.
 *
 * On a phone the top bar has no room for a box beside the breadcrumb and the
 * person's address, so it is the word *Search* until pressed, and the box then
 * lies over the top bar until it is closed or a screen is chosen.
 */
export const FeatureSearch = () => {
  const pathname = usePathname()
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState("")
  const [marked, setMarked] = useState<number | undefined>(undefined)
  const [revealed, setRevealed] = useState(false)
  const reveal = useCallback(() => flushSync(() => setRevealed(true)), [])

  const empty = () => {
    setQuery("")
    setMarked(undefined)
  }

  const close = () => {
    empty()
    setRevealed(false)
  }

  useSlashToSearch(input, reveal)

  useEffect(() => {
    setQuery("")
    setMarked(undefined)
    setRevealed(false)
  }, [pathname])

  const { found, inAProject } = searchAnswer(query, projectInAddress(pathname))
  const open = query.trim() !== ""
  const optionId = (index: number) => `${listId}-${index}`

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setMarked(movedTo(marked, found.length, event.key === "ArrowDown" ? "down" : "up"))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const chosen = found[marked ?? 0]
      if (chosen !== undefined) router.push(chosen.href)
    } else if (event.key === "Escape") {
      if (query === "") setRevealed(false)
      else empty()
    }
  }

  return (
    <div role="search" className="ml-auto shrink-0 sm:relative sm:w-72">
      <button
        type="button"
        onClick={() => {
          reveal()
          input.current?.focus()
        }}
        className="text-ink-secondary hover:text-ink text-sm sm:hidden"
      >
        Search
      </button>
      <div
        className={`${
          revealed
            ? "bg-surface-topbar fixed inset-x-0 top-0 z-10 flex h-14 items-center gap-3 px-4"
            : "hidden"
        } sm:static sm:flex sm:h-auto sm:bg-transparent sm:p-0`}
      >
        <label htmlFor={`${listId}-box`} className="sr-only">
          Search the portal
        </label>
        <input
          ref={input}
          id={`${listId}-box`}
          type="search"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={marked === undefined ? undefined : optionId(marked)}
          placeholder="Search the portal"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setMarked(undefined)
          }}
          onKeyDown={onKeyDown}
          className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder focus:border-edge-strong min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={close}
          className="text-ink-secondary hover:text-ink text-sm sm:hidden"
        >
          Close
        </button>
        {open && (
          <div className="border-edge-subtle bg-surface-base absolute inset-x-4 top-full mt-1 rounded-md border shadow-sm sm:inset-x-auto sm:right-0 sm:w-96">
            <ul
              id={listId}
              role="listbox"
              aria-label="Found in the portal"
              className="m-0 list-none p-1"
            >
              {found.map(({ feature, href }, index) => (
                <li
                  key={`${feature.name} ${href}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === marked}
                  className={`rounded-sm ${index === marked ? "bg-surface-active" : ""}`}
                >
                  <Link
                    href={href}
                    tabIndex={-1}
                    className="hover:bg-surface-hover flex flex-col gap-0.5 rounded-sm px-2 py-1.5 no-underline"
                  >
                    <span className="text-ink text-sm">
                      {feature.name}
                      {feature.on !== undefined && (
                        <span className="text-ink-muted text-xs"> · on {feature.on}</span>
                      )}
                    </span>
                    <span className="text-ink-muted text-xs">{feature.does}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {found.length === 0 && inAProject === 0 && (
              <p className="text-ink-muted m-0 px-3 pb-2 text-xs">
                Nothing in the portal goes by that. To look through what readers did, your pages or
                their changes, use the Find on that screen.
              </p>
            )}
            {inAProject > 0 && (
              <p className="text-ink-muted m-0 px-3 pb-2 text-xs">
                {inAProject === 1 ? "One more answer is" : `${inAProject} more answers are`} inside
                a project. Open one from Projects to go there.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
