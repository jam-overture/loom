"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { searchDocs, type SearchHit } from "@/app/(docs)/_lib/search/match"
import {
  parseSearchCode,
  parseSearchIndex,
  parseSearchProse,
  SEARCH_CODE_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_PROSE_PATH,
  SEARCH_RESULT_LIMIT,
  withCode,
  withProse,
  type SearchCode,
  type SearchIndex,
  type SearchKind,
  type SearchProse,
} from "@/app/(docs)/_lib/search/model"

/**
 * The search box, and the dialog behind it.
 *
 * Site chrome in the sense 0067 gives the word — furniture rather than content,
 * and the one part of this surface that is allowed not to be a Loom tree. A
 * combobox with a listbox under it is not something a page is *configured* to
 * have; it is how the reader gets to the pages.
 *
 * Three things it does that a search box is judged on and usually gets wrong:
 *
 * - **It costs nothing until it is opened.** The index is fetched on the first
 *   open and kept, so a reader who never searches never downloads it.
 * - **It is usable from the keyboard alone**, which is how the people most
 *   likely to search a reference actually search it: `⌘K` or `/` to open,
 *   arrows to move, `Enter` to go, `Escape` to leave — and focus returns to the
 *   button that opened it rather than to the top of the document.
 * - **It says what happened.** Loading, nothing found, and could-not-load are
 *   three different sentences, because a box that shows an empty list for all
 *   three teaches a reader that the site has nothing on the subject.
 * - **It shows the sentence it found**, where a row is in the list because of
 *   its prose rather than its name. A heading offered for a word that is not in
 *   the heading looks like a bug until the reader can see the words that earned
 *   it.
 */

const KIND_LABEL: Readonly<Record<SearchKind, string>> = {
  page: "Page",
  heading: "Section",
  export: "Export",
}

type Loading = "idle" | "loading" | "ready" | "failed"

const OPTION_ID = (position: number): string => `loom-search-result-${position}`

const Results = ({
  hits,
  active,
  onPick,
  onHover,
}: {
  readonly hits: readonly SearchHit[]
  readonly active: number
  readonly onPick: (href: string) => void
  readonly onHover: (position: number) => void
}) => (
  <ul id="loom-search-results" role="listbox" aria-label="Results" className="max-h-96 overflow-y-auto py-2">
    {hits.map((hit, position) => (
      <li
        key={hit.entry.href}
        id={OPTION_ID(position)}
        role="option"
        aria-selected={position === active}
        onMouseMove={() => onHover(position)}
        /*
         * Marked in two ways, for the reason the rail marks the current page in
         * two ways: `aria-selected` is what a screen reader announces, and the
         * mint edge is what somebody looking at the screen sees. A row told
         * apart only by two very close greys is told apart by nobody.
         */
        className={
          position === active
            ? "border-accent-ring bg-surface-hover border-l-2"
            : "border-l-2 border-transparent"
        }
      >
        {/*
         * A real anchor rather than a row that only answers to a click: a
         * reader who wants the reference open in a second tab should be able to
         * middle-click it like any other link on the site.
         */}
        <a
          href={hit.entry.href}
          tabIndex={-1}
          onClick={(event) => {
            event.preventDefault()
            onPick(hit.entry.href)
          }}
          className="flex items-baseline justify-between gap-4 px-4 py-2"
        >
          <span className="min-w-0">
            <span
              className={`text-ink block truncate text-sm ${
                hit.entry.kind === "export" ? "font-mono text-[0.8125rem]" : ""
              }`}
            >
              {hit.entry.title}
            </span>
            <span className="text-ink-faint block truncate text-xs">
              {hit.entry.summary === "" ? hit.entry.context : `${hit.entry.context} — ${hit.entry.summary}`}
            </span>

            {/*
             * The sentence — or the line of code — that put this row in the
             * list, shown only when the title did not already carry the query.
             * It is why a reader can account for a heading that does not
             * contain the word they typed, and it wraps to two lines rather
             * than truncating, because half a sentence answers nothing.
             *
             * A code excerpt is set in the mono face, at the size the reference
             * uses for a signature: a line of TypeScript in the prose face
             * reads as prose that has gone wrong, and a reader scanning ten
             * rows should be able to tell a snippet from a sentence without
             * reading either.
             */}
            {hit.excerpt.length > 0 && (
              <span
                className={`text-ink-muted mt-1 line-clamp-2 block text-xs leading-snug ${
                  hit.excerptIsCode ? "font-mono text-[0.6875rem]" : ""
                }`}
              >
                {hit.excerpt.map((part, at) =>
                  part.match ? (
                    <mark key={at} className="text-ink bg-transparent font-semibold">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={at}>{part.text}</span>
                  )
                )}
              </span>
            )}
          </span>

          <span className="text-ink-faint shrink-0 text-[0.65rem] tracking-wide uppercase">
            {KIND_LABEL[hit.entry.kind]}
          </span>
        </a>
      </li>
    ))}
  </ul>
)

export const Search = () => {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [index, setIndex] = useState<SearchIndex | undefined>(undefined)
  const [prose, setProse] = useState<SearchProse | undefined>(undefined)
  const [code, setCode] = useState<SearchCode | undefined>(undefined)
  const [loading, setLoading] = useState<Loading>("idle")

  const trigger = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)

  const close = useCallback((): void => {
    setOpen(false)
    setQuery("")
    setActive(0)
    trigger.current?.focus()
  }, [])

  /** `⌘K`, `Ctrl+K` and `/` — the three a reader tries without being told. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const typing =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)

      const shortcut = (event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)

      if (!shortcut) return

      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  /**
   * The index, fetched once and only once it is wanted.
   *
   * `idle` is the state that makes that true: the effect runs on every open and
   * does nothing after the first, so re-opening the dialog is free and a failed
   * fetch stays failed rather than retrying on every keystroke.
   *
   * **Three files leave together and only one is waited for.** The index is
   * what the box needs to answer anything at all; the words under each entry
   * and the code beside them are the two cheapest bands of the ranking and
   * several times the size, so all three are asked for at the same moment and
   * each is merged whenever it turns up. A reader typing in between gets the
   * same results in the same order, without the bands that have not landed —
   * and if either never arrives the box carries on as it did before the site
   * indexed that half at all, rather than failing.
   */
  useEffect(() => {
    if (!open || loading !== "idle") return

    setLoading("loading")

    const read = (path: string): Promise<unknown> =>
      fetch(path).then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
      )

    void read(SEARCH_INDEX_PATH)
      .then((body: unknown) => {
        setIndex(parseSearchIndex(body))
        setLoading("ready")
      })
      .catch(() => setLoading("failed"))

    void read(SEARCH_PROSE_PATH)
      .then((body: unknown) => setProse(parseSearchProse(body)))
      .catch(() => undefined)

    void read(SEARCH_CODE_PATH)
      .then((body: unknown) => setCode(parseSearchCode(body)))
      .catch(() => undefined)
  }, [open, loading])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  /**
   * The three files, folded together in the order they are ranked.
   *
   * Each fold is skipped while its file is missing rather than waited for, so
   * the box is searchable the moment the entries land and gains a band as each
   * of the other two arrives.
   */
  const searchable =
    index === undefined
      ? undefined
      : [
          (found: SearchIndex) => (prose === undefined ? found : withProse(found, prose)),
          (found: SearchIndex) => (code === undefined ? found : withCode(found, code)),
        ].reduce((found, fold) => fold(found), index)

  const hits = searchable === undefined ? [] : searchDocs(searchable, query, SEARCH_RESULT_LIMIT)

  /**
   * What has not landed, in the words the empty state uses.
   *
   * Read off the two optional files rather than tracked as a fourth state,
   * because the honest sentence is a list of what is missing and that is
   * exactly what these two are. Built here so the claim under *nothing on the
   * site says this* can never drift from what was really searched.
   */
  const pending: readonly string[] = [
    ...(prose === undefined ? ["the words in them are"] : []),
    ...(code === undefined ? ["the code in them is"] : []),
  ]

  const go = (href: string): void => {
    close()
    router.push(href)
  }

  const onFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
      return
    }

    if (event.key === "Enter") {
      const chosen = hits[active]

      if (chosen !== undefined) {
        event.preventDefault()
        go(chosen.entry.href)
      }

      return
    }

    /*
     * The dialog says `aria-modal`, so it has to mean it. Every result is a
     * link with `tabIndex={-1}` and the scrim is not a tab stop either, which
     * leaves the field as the only one — so holding focus is holding it here.
     * Without this, Tab walks out of an open dialog and into the page behind
     * it, which is the thing `aria-modal` promises does not happen.
     */
    if (event.key === "Tab") {
      event.preventDefault()
      return
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    if (hits.length === 0) return

    event.preventDefault()

    /** Wrapping, because a list of ten is short enough that stopping at the end feels broken. */
    setActive((was) =>
      event.key === "ArrowDown" ? (was + 1) % hits.length : (was - 1 + hits.length) % hits.length
    )
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        className="border-edge text-ink-faint hover:text-ink hover:border-edge-strong flex h-8 items-center gap-2 rounded-md border px-2 text-sm whitespace-nowrap transition-colors sm:w-60 sm:justify-between sm:px-3"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>⌕</span>
          <span className="hidden sm:inline">Search the documentation</span>
          <span className="sr-only sm:hidden">Search the documentation</span>
        </span>
        <kbd className="border-edge text-ink-faint hidden rounded border px-1 font-mono text-[0.65rem] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8">
          {/* The scrim closes on a click, which is the other thing every reader tries. */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close search"
            onClick={close}
            className="bg-ink/20 absolute inset-0 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search the documentation"
            className="border-edge bg-surface-page relative mt-8 w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl"
          >
            <div className="border-edge flex items-center gap-3 border-b px-4">
              <span aria-hidden className="text-ink-faint">
                ⌕
              </span>

              <input
                ref={field}
                type="text"
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls="loom-search-results"
                aria-autocomplete="list"
                {...(hits[active] === undefined ? {} : { "aria-activedescendant": OPTION_ID(active) })}
                autoComplete="off"
                spellCheck={false}
                placeholder="Search the pages, their words and every name"
                aria-label="Search the documentation"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                onKeyDown={onFieldKeyDown}
                className="text-ink placeholder:text-ink-faint h-12 w-full bg-transparent text-sm focus:outline-none"
              />
            </div>

            {loading === "loading" && <p className="text-ink-faint px-4 py-6 text-sm">Loading the index…</p>}

            {loading === "failed" && (
              <p className="text-ink-muted px-4 py-6 text-sm">
                The search index could not be loaded. Every page is still in the rail on the left.
              </p>
            )}

            {loading === "ready" && query !== "" && hits.length === 0 && (
              <div className="px-4 py-6">
                <p className="text-ink-muted text-sm">Nothing on the site says “{query}”.</p>
                {/*
                 * The sentence above is a strong claim, so the one under it says
                 * exactly how much was looked at. It was worth writing only once
                 * the prose was searched: before that the claim was routinely
                 * false, and a reader who could see the words on the page had no
                 * way to know the box had never read them.
                 */}
                {/*
                 * And it says less when it has looked at less. The words and the
                 * code blocks arrive in two more files, so for the moment before
                 * they land the claim above is narrower than it will be — and
                 * saying otherwise would be the exact overclaim the sentence was
                 * written to end. The last clause used to read "code blocks are
                 * not", which was true and is the thing this file stopped being
                 * able to say.
                 */}
                <p className="text-ink-faint mt-1 text-xs">
                  {pending.length === 0
                    ? "Every page, every section, the words in them, the code in them and every published name are searched."
                    : `Every page, every section and every published name are searched. ${pending.join(" and ")} still loading.`}
                </p>
              </div>
            )}

            {hits.length > 0 && (
              <Results hits={hits} active={active} onPick={go} onHover={setActive} />
            )}

            <p className="border-edge text-ink-faint flex gap-4 border-t px-4 py-2 text-[0.7rem]">
              <span>↑↓ to move</span>
              <span>↵ to open</span>
              <span>esc to close</span>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
