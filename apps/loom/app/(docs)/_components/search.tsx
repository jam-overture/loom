"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { ARTICLE_ID } from "@/app/(docs)/_lib/chrome"
import { showInScroller } from "@/app/(docs)/_lib/in-view"
import { searchDocs, type SearchHit } from "@/app/(docs)/_lib/search/match"
import {
  parseSearchCode,
  parseSearchIndex,
  parseSearchNames,
  parseSearchProse,
  SEARCH_CODE_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_NAMES_PATH,
  SEARCH_RESULT_LIMIT,
  searchProsePath,
  withCode,
  withNames,
  withProse,
  type SearchCode,
  type SearchIndex,
  type SearchKind,
  type SearchNames,
  type SearchProse,
} from "@/app/(docs)/_lib/search/model"
import { docsSectionOfPath, proseSectionsIn } from "@/app/(docs)/_lib/search/shards"

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
 *   arrows to move, `Enter` to go, `Escape` to leave.
 * - **And the way out decides where the reader is left**, which is 0237 applied
 *   to the one way out that record has no row for. Escape and a press on the
 *   scrim are a reader leaving, so they get the button back. A press on a
 *   result is a reader asking for a page, and 0237's own reason for never
 *   returning focus on an outside press — the press is itself a destination —
 *   is the reason this one does not either. It hands them the page instead.
 * - **It says what happened.** Loading, nothing found, and could-not-load are
 *   three different sentences, because a box that shows an empty list for all
 *   three teaches a reader that the site has nothing on the subject.
 * - **It shows the sentence it found**, where a row is in the list because of
 *   its prose rather than its name. A heading offered for a word that is not in
 *   the heading looks like a bug until the reader can see the words that earned
 *   it.
 * - **It does not show one page sixteen times.** The reference's doors are one
 *   page rendered per import, so a sentence they share matches all of them; such
 *   a run arrives as one row saying how many there were, and the nine slots it
 *   gives back go to the rest of the site. `match.ts` folds them — nothing here
 *   decides it, because what a list of ten *contains* is a ranking question and
 *   this file only draws it.
 */

const KIND_LABEL: Readonly<Record<SearchKind, string>> = {
  page: "Page",
  heading: "Section",
  export: "Export",
}

type Loading = "idle" | "loading" | "ready" | "failed"

const OPTION_ID = (position: number): string => `loom-search-result-${position}`

/** A static file, or a rejection carrying the status a reader will never see. */
const readJson = (path: string): Promise<unknown> =>
  fetch(path).then((response) =>
    response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
  )

const Results = ({
  hits,
  active,
  byKeyboard,
  onPick,
  onHover,
}: {
  readonly hits: readonly SearchHit[]
  readonly active: number
  /** Whether the last thing that moved the selection was a key. See below. */
  readonly byKeyboard: boolean
  readonly onPick: (href: string) => void
  readonly onHover: (position: number) => void
}) => {
  const list = useRef<HTMLUListElement>(null)

  /**
   * Keep the selected row on screen, which this list did not.
   *
   * Ten answers with their sentences under them are 536 pixels in a box that
   * shows 384, so the ninth ArrowDown used to select a row 92 pixels below the
   * bottom edge. Everything about that was right except the only part a
   * sighted reader has: `aria-selected` moved, `aria-activedescendant` moved, a
   * screen reader was told — and the highlight left the last visible row and
   * nothing took its place. `in-view.ts` is the rule, and the rail is its other
   * caller.
   *
   * **Only when a key moved it**, which is the condition this list needs and
   * the rail does not. The selection also follows the mouse, and a list that
   * scrolled on hover would pull a different row under a stationary cursor,
   * which fires another hover, which scrolls it again. Typing counts as a key:
   * a new query selects the first row, and the list has to come back to the
   * top to show it.
   *
   * The same reasoning as the browser's own focus ring, which it paints on the
   * strength of the last input having been a keyboard.
   */
  useEffect(() => {
    const row = list.current?.children[active]

    if (byKeyboard && list.current !== null && row !== undefined) showInScroller(list.current, row)
  }, [active, byKeyboard, hits])

  return (
  <ul ref={list} id="loom-search-results" role="listbox" aria-label="Results" className="max-h-96 overflow-y-auto py-2">
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

            {/*
             * What else the query reached, where this row is standing in for a
             * set of pages built from one template. Sixteen reference pages are
             * one page rendered per import, so a sentence in a band they share
             * matches all sixteen — and nine rows saying one thing about nine
             * doors used to fill a list ten rows long, pushing the page a reader
             * actually wanted off the bottom of it.
             *
             * It is worded over the total rather than the remainder — *the
             * closest of 9* rather than *and 8 more* — so the noun is always
             * plural and one spelling of it does every case. A folded row always
             * stands for at least two, which is what makes that safe.
             */}
            {hit.folded !== undefined && (
              <span className="text-ink-faint mt-1 block text-xs">
                {`the closest of ${hit.folded.matched} ${hit.folded.noun}`}
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
}

export const Search = () => {
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  /**
   * Whether a key put the selection where it is, which the list below needs
   * and nothing else does. See `Results` for why the mouse is excluded.
   */
  const [byKeyboard, setByKeyboard] = useState(false)
  const [index, setIndex] = useState<SearchIndex | undefined>(undefined)
  const [names, setNames] = useState<SearchNames | undefined>(undefined)
  const [prose, setProse] = useState<readonly SearchProse[]>([])
  const [asked, setAsked] = useState<readonly string[]>([])
  const [ownSettled, setOwnSettled] = useState(false)
  const [code, setCode] = useState<SearchCode | undefined>(undefined)
  const [loading, setLoading] = useState<Loading>("idle")

  const trigger = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)

  /** Shut, with nothing said about the reader. Both ways out start here. */
  const dismiss = useCallback((): void => {
    setOpen(false)
    setQuery("")
    setActive(0)
    setByKeyboard(false)
  }, [])

  /** A reader leaving: Escape, and the scrim. They came from the button. */
  const close = useCallback((): void => {
    dismiss()
    trigger.current?.focus()
  }, [dismiss])

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
   * The words of one section, merged whenever they turn up.
   *
   * Kept as a list of parts rather than one merged object because merging is
   * what `withProse` is for and doing it twice would be two answers to the same
   * question. A part that never arrives is a section whose sentences cannot be
   * found; nothing else about the box changes.
   */
  const readProse = useCallback((section: string): Promise<void> => {
    setAsked((sections) => (sections.includes(section) ? sections : [...sections, section]))

    return readJson(searchProsePath(section))
      .then((body: unknown) => setProse((parts) => [...parts, parseSearchProse(body)]))
      .catch(() => undefined)
  }, [])

  /**
   * The index, fetched once and only once it is wanted.
   *
   * `idle` is the state that makes that true: the effect runs on every open and
   * does nothing after the first, so re-opening the dialog is free and a failed
   * fetch stays failed rather than retrying on every keystroke.
   *
   * **Four kinds of file leave together and only one is waited for.** The first
   * is the site's own table of contents, which is what the box needs to answer
   * anything at all. The runtime's published names, the words under each entry
   * and the code beside them are asked for at the same moment and each is
   * merged whenever it turns up. A reader typing in between gets the same
   * results in the same order, without the bands that have not landed — and if
   * one never arrives the box carries on as it did before the site indexed that
   * part at all, rather than failing.
   *
   * The names are the one whose absence a reader could mistake for an answer,
   * because they bring rows rather than rank the ones already there. That is
   * what the sentence under *nothing on the site says this* is for.
   *
   * **The words are the one that is now several files, and the reader's own
   * section goes first.** It is asked for here, off the address bar alone,
   * without waiting for the table of contents — a reader searching from *The
   * runtime* is usually searching the runtime, and the file that answers them
   * should not be queued behind four others. A reader standing somewhere with
   * no section of its own has nothing to put first, and the effect below sends
   * for the lot in reading order instead.
   */
  useEffect(() => {
    if (!open || loading !== "idle") return

    setLoading("loading")

    void readJson(SEARCH_INDEX_PATH)
      .then((body: unknown) => {
        setIndex(parseSearchIndex(body))
        setLoading("ready")
      })
      .catch(() => setLoading("failed"))

    void readJson(SEARCH_NAMES_PATH)
      .then((body: unknown) => setNames(parseSearchNames(body)))
      .catch(() => undefined)

    void readJson(SEARCH_CODE_PATH)
      .then((body: unknown) => setCode(parseSearchCode(body)))
      .catch(() => undefined)

    const here = docsSectionOfPath(pathname)

    if (here === undefined) {
      setOwnSettled(true)

      return
    }

    void readProse(here).finally(() => setOwnSettled(true))
  }, [open, loading, pathname, readProse])

  /**
   * The rest of the site's words, **behind** the reader's own section rather
   * than beside it.
   *
   * Waiting on the first one to settle is the whole of the ordering: four
   * parallel requests share a connection and arrive together, so asking for the
   * reader's section first and the rest after it lands is the difference
   * between a promise about ordering and an ordering. `settled` rather than
   * `arrived`, because a section whose file 404s must not hold the other three
   * hostage.
   *
   * Which sections exist is read off the table of contents, so this waits on
   * that too — see `proseSectionsIn` for why it is not read from `nav.ts`, and
   * for why the ones left have no order worth choosing between.
   */
  useEffect(() => {
    if (!open || index === undefined || !ownSettled) return

    for (const section of proseSectionsIn(index).filter((section) => !asked.includes(section))) {
      void readProse(section)
    }
  }, [open, index, ownSettled, asked, readProse])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  /**
   * The files, folded together in the order they are ranked.
   *
   * Each fold is skipped while its file is missing rather than waited for, so
   * the box is searchable the moment the contents land and gains a band as each
   * of the others arrives. The names go first because the other two fold words
   * and blocks *onto* entries, and a name that has not arrived yet is not an
   * entry to fold anything onto.
   *
   * The words are several files and fold one after another, which needs no
   * special case: each carries the bodies of one section and no two carry the
   * same address, so folding none of them, one of them or all of them are the
   * same operation done a different number of times.
   */
  const searchable =
    index === undefined
      ? undefined
      : [
          (found: SearchIndex) => (names === undefined ? found : withNames(found, names)),
          (found: SearchIndex) => prose.reduce((so_far, part) => withProse(so_far, part), found),
          (found: SearchIndex) => (code === undefined ? found : withCode(found, code)),
        ].reduce((found, fold) => fold(found), index)

  const hits = searchable === undefined ? [] : searchDocs(searchable, query, SEARCH_RESULT_LIMIT)

  /**
   * What has not landed, in the words the empty state uses.
   *
   * Read off the later files rather than tracked as another state, because the
   * honest sentence is a list of what is missing and that is exactly what they
   * are. Built here so the claim under *nothing on the site says this* can
   * never drift from what was really searched.
   *
   * **The words count as missing until every section has answered**, even
   * though the reader's own section usually answered first. That is an
   * under-claim rather than an over-claim, and deliberately: the sentence above
   * it is about the whole site, so a box that has read one section of four has
   * not read what that sentence says it has.
   *
   * Every phrase is plural so that one verb serves any number of them, which is
   * the sort of thing that matters here: the alternative is three sentences and
   * a rule for choosing between them, for a message shown for a second.
   */
  const pending: readonly string[] = [
    ...(names === undefined ? ["the published names"] : []),
    ...(index !== undefined && prose.length >= proseSectionsIn(index).length ? [] : ["the words on them"]),
    ...(code === undefined ? ["the code blocks on them"] : []),
  ]

  /** `a`, `a and b`, `a, b and c` — the join an English sentence wants. */
  const listOf = (parts: readonly string[]): string =>
    parts.length < 2
      ? (parts[0] ?? "")
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`

  /**
   * A reader arriving, which is the other thing entirely.
   *
   * Three notes, because each of them was the obvious thing done differently.
   *
   * **`dismiss` and not `close`.** Returning the reader to the search button
   * leaves them in the header of a page they have not seen, with the skip link
   * behind them in the tab order and the rail's own mark unreachable without
   * going backwards. They asked for a page.
   *
   * **The article is focused rather than scrolled to.** `preventScroll` is
   * load-bearing: the router knows whether the destination is a page or a
   * position on one, and a result can be either — a heading on the page the
   * reader is already on is a result like any other. Moving focus and leaving
   * every scroll to the router is the only way those two do not fight.
   *
   * **No waiting for the navigation to commit.** `#article` is rendered by the
   * layout, so it is the same element before and after; focusing it now and
   * letting the new page render inside it leaves the reader at the top of what
   * they asked for, with no timer and nothing to clean up.
   */
  const go = (href: string): void => {
    dismiss()
    router.push(href)
    document.getElementById(ARTICLE_ID)?.focus({ preventScroll: true })
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

    setByKeyboard(true)

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
                  setByKeyboard(true)
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
                 * And it says less when it has looked at less. Three of the four
                 * files arrive after this box opens, so for the moment before
                 * they land the claim above is narrower than it will be — and
                 * saying otherwise would be the exact overclaim the sentence was
                 * written to end.
                 *
                 * **The published names moved from the first clause to this
                 * list on 19 September**, when they moved out of the file the
                 * box waits for. Until then they were always there by the time
                 * anybody could read this, so the sentence could name them among
                 * the things it had searched. It cannot any more, and a sentence
                 * claiming to have searched a thousand names that are still in
                 * flight is the worst of the three states to be wrong about: a
                 * reader who types an export name and is told the site has never
                 * heard of it will believe it.
                 */}
                <p className="text-ink-faint mt-1 text-xs">
                  {pending.length === 0
                    ? "Every page, every section, the words in them, the code in them and every published name are searched."
                    : `Every page and every section are searched — ${listOf(pending)} are still loading.`}
                </p>
              </div>
            )}

            {hits.length > 0 && (
              <Results
                hits={hits}
                active={active}
                byKeyboard={byKeyboard}
                onPick={go}
                onHover={(position) => {
                  setActive(position)
                  setByKeyboard(false)
                }}
              />
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
