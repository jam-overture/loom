import Link from "next/link"

import type { EntryProse, ProseMention } from "@/app/(docs)/_lib/api/mentions"
import {
  apiAnchorFor,
  apiSymbolCount,
  type ApiEntry,
  type ApiGroup,
  type ApiKind,
  type ApiSymbol,
} from "@/app/(docs)/_lib/api/model"

/**
 * The reference, rendered.
 *
 * Furniture rather than content, in the sense 0067 uses: nothing here decides
 * what the page says. The words are the package's own — its declarations and
 * the paragraphs its modules open with — and this file only arranges them.
 *
 * Two arrangements are deliberate and both are the brief's rule about who is
 * reading. **The sentence comes before the signature**, every time: a reader
 * who has landed on `planReverts` wants to know what it is for before they are
 * shown three type parameters. And **the module's own paragraph sits under its
 * heading**, so a section explains itself before it starts listing names.
 *
 * There is no interactivity at all, which is a decision rather than an
 * omission. A page here can carry three hundred and sixty exports; making each
 * signature a copy button would mean three hundred and sixty client components
 * for a convenience nobody asked for on a page they are reading rather than
 * pasting from.
 */

const KIND_TITLE: Readonly<Record<ApiKind, string>> = {
  function: "a function",
  value: "a value",
  schema: "a Zod schema — its shape is the type it parses to",
  type: "a type",
  interface: "an interface",
  class: "a class",
}

/** A group's anchor, from a module path: `tree/tree` becomes `m-tree-tree`. */
export const apiGroupAnchor = (module: string): string =>
  `m-${module.replace(/[^A-Za-z0-9]+/g, "-")}`

/**
 * A doc comment's backticks, honoured.
 *
 * The runtime's authors write `nodeId` the way everyone writes a name in
 * prose, and a reference that printed the backticks would be showing its
 * seams. This is the whole of the markdown these summaries are allowed —
 * anything more and a doc comment becomes a formatting language nobody
 * declared.
 */
const CODE_SPAN = /`([^`]+)`/g

export const Prose = ({ text }: { readonly text: string }) => (
  <>
    {text.split(CODE_SPAN).map((part, index) =>
      index % 2 === 0 ? (
        part
      ) : (
        <code key={`${index}-${part}`} className="code-chip font-mono">
          {part}
        </code>
      )
    )}
  </>
)

const KindBadge = ({ kind }: { readonly kind: ApiKind }) => (
  <span
    title={KIND_TITLE[kind]}
    className="border-edge text-ink-faint shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.6875rem] font-normal tracking-wide"
  >
    {kind}
  </span>
)

const Signature = ({ symbol }: { readonly symbol: ApiSymbol }) => (
  <pre className="border-edge bg-code-surface text-code-ink mt-3 overflow-x-auto rounded-lg border p-3 font-mono text-[0.8125rem] leading-relaxed">
    {symbol.signature}
  </pre>
)

/**
 * Where a name is shown in use, under the name.
 *
 * A signature answers *what shape is this*. A reader who arrived from search
 * having never seen Loom before is asking something else — *what is this for*,
 * and *what does the sentence around it look like* — and the written pages
 * answer that. Nothing on this page could reach them until now.
 *
 * **"Shown in use on" is the strongest thing the evidence supports**, and the
 * wording is deliberate. What the site knows is that the page prints this name
 * in code; whether the page teaches the export is a judgement nobody made. A
 * link that promised an explanation and delivered a code block would be worse
 * than the silence it replaced.
 */
const ShownInUse = ({ mentions }: { readonly mentions: readonly ProseMention[] }) => (
  <p className="text-ink-muted mt-2 text-sm">
    <span className="text-ink-faint">Shown in use on </span>
    {mentions.map((mention, index) => (
      <span key={mention.href}>
        {index === 0 ? "" : index === mentions.length - 1 ? " and " : ", "}
        <Link href={mention.href} className="text-ink underline underline-offset-2 hover:no-underline">
          {mention.pageTitle}
        </Link>
        {mention.headingText === "" ? null : (
          <span className="text-ink-faint"> — {mention.headingText}</span>
        )}
      </span>
    ))}
  </p>
)

const SymbolEntry = ({
  symbol,
  mentions,
}: {
  readonly symbol: ApiSymbol
  readonly mentions: readonly ProseMention[]
}) => (
  <div id={apiAnchorFor(symbol.name)} className="scroll-mt-24 py-6">
    <h3 className="text-ink flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.9375rem] font-semibold">
      {symbol.name}
      <KindBadge kind={symbol.kind} />
    </h3>

    {symbol.summary === "" ? null : (
      <p className="text-ink-muted mt-2 text-[0.9375rem] leading-relaxed">
        <Prose text={symbol.summary} />
      </p>
    )}

    {mentions.length === 0 ? null : <ShownInUse mentions={mentions} />}

    <Signature symbol={symbol} />

    {symbol.truncated ? (
      <p className="text-ink-faint mt-2 text-xs">
        Cut short here — the whole of it is longer than a page can usefully hold.
      </p>
    ) : null}
  </div>
)

const Group = ({
  group,
  prose,
}: {
  readonly group: ApiGroup
  readonly prose: EntryProse
}) => (
  <section id={apiGroupAnchor(group.module)} className="scroll-mt-24">
    <h2 className="text-ink border-edge mt-14 border-t pt-8 text-[1.375rem] leading-tight font-bold tracking-tight">
      {group.title}
    </h2>

    <p className="text-ink-faint mt-2 font-mono text-xs">{group.module}</p>

    {group.summary === "" ? null : (
      <p className="text-ink-muted mt-3 leading-relaxed">
        <Prose text={group.summary} />
      </p>
    )}

    <div className="divide-edge mt-1 divide-y">
      {group.symbols.map((symbol) => (
        <SymbolEntry
          key={symbol.name}
          symbol={symbol}
          mentions={prose.byName.get(symbol.name) ?? []}
        />
      ))}
    </div>
  </section>
)

/**
 * The list of what is on the page, before the page starts.
 *
 * A reference is read by people who arrived looking for one name, and a rail
 * that stops at the page title leaves them scrolling. This is the second half
 * of the navigation and it belongs to the page rather than to the chrome,
 * because it is different on every one of them.
 */
const Contents = ({ entry }: { readonly entry: ApiEntry }) => (
  <nav aria-label="On this page" className="border-edge mt-8 rounded-lg border px-4 py-4">
    <p className="text-ink-faint text-xs font-semibold tracking-wide uppercase">On this page</p>

    {/*
     * Columns rather than a two-column grid: a list is read down, then across.
     * This carried a `block!` while `.prose ul` reached in here and forced
     * `display: flex`, which a flex container would have made `columns`
     * ignore. The barrier keeps that rule out now, so the list is a block
     * because a `ul` is one.
     */}
    <ul className="mt-3 sm:columns-2 sm:gap-x-8">
      {entry.groups.map((group) => (
        <li key={group.module} className="flex items-baseline justify-between gap-3 py-0.5">
          <a
            href={`#${apiGroupAnchor(group.module)}`}
            className="text-ink hover:text-ink-muted text-sm underline underline-offset-2"
          >
            {group.title}
          </a>
          <span className="text-ink-faint shrink-0 font-mono text-xs">{group.symbols.length}</span>
        </li>
      ))}
    </ul>
  </nav>
)

/**
 * The prose before the names, and the size of the gap between them.
 *
 * This is the first thing on the most intimidating page on the site — a door
 * with three hundred and sixty exports behind it — and it exists because a
 * reader who lands here from search has almost certainly arrived at the wrong
 * place first. The written pages are where the reading is; this says which of
 * them talk about this door, and how much of it each one reaches.
 *
 * **The count is stated rather than hidden**, and that is the part worth
 * defending. A band that only listed the pages would let a reader take three
 * links for a documented entry point. Naming the fraction is the same rule the
 * theming page's contrast audit follows: printing only what clears the bar is
 * how a page tells a comfortable lie without writing a false sentence.
 *
 * Which is also why the band is here **when no page names anything**, rather
 * than quietly absent. Three of the eleven doors are in that state today. A
 * reader who is told so stops looking; a reader shown nothing goes hunting
 * through a sidebar that was never going to have it.
 *
 * The list is not capped. Nine pages is the most any door draws and they are one
 * line each — and a cap here would be the site deciding, silently, which of its
 * own pages a reader is allowed to hear about.
 */
const ProseFirst = ({
  entry,
  prose,
}: {
  readonly entry: ApiEntry
  readonly prose: EntryProse
}) => (
  <nav
    aria-label="Written pages about this import"
    className="border-edge bg-surface-muted mt-8 rounded-lg border px-4 py-4"
  >
    {prose.pages.length === 0 ? (
      <p className="text-ink text-sm">
        <span className="font-semibold">No written page names any of this import's exports yet.</span>{" "}
        <span className="text-ink-muted">
          What is below is the whole of what this site says about it — the signatures, and the
          sentence each author left on the declaration.
        </span>
      </p>
    ) : (
      <>
        <p className="text-ink text-sm font-semibold">
          New to this part of Loom? Start with the prose.
        </p>

        {/* `.not-prose` is a cascade barrier now, so this is a plain list
            wearing Tailwind's preflight reset and nothing else. The `block!`
            that used to be here was written against `.prose ul`'s
            `display: flex`, on the belief that a utility class loses to it;
            measured, a utility always wins — what leaked was every property
            the component did not name. Neither is true inside the barrier. */}
        <ul className="mt-3 space-y-1">
          {prose.pages.map((page) => (
            <li key={page.href} className="flex items-baseline justify-between gap-3">
              <Link
                href={page.href}
                className="text-ink hover:text-ink-muted text-sm underline underline-offset-2"
              >
                {page.title}
              </Link>
              <span className="text-ink-faint shrink-0 text-xs">
                {page.sectionTitle} · {page.named} {page.named === 1 ? "name" : "names"}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-ink-faint mt-3 text-xs">
          {prose.named} of the {apiSymbolCount(entry)} exports below are shown in use on a written
          page. The rest are described by their own signature and the sentence their author left on
          them, and nowhere else.
        </p>
      </>
    )}
  </nav>
)

export const ApiEntryReference = ({
  entry,
  prose,
}: {
  readonly entry: ApiEntry
  readonly prose: EntryProse
}) => (
  <div className="not-prose">
    <p className="text-ink-faint mt-6 text-sm">
      {apiSymbolCount(entry)} exports, in {entry.groups.length}{" "}
      {entry.groups.length === 1 ? "module" : "modules"}. Generated from{" "}
      <code className="code-chip font-mono text-xs">{entry.types}</code>, which is the declaration file this
      package publishes for <code className="code-chip font-mono text-xs">{entry.specifier}</code>.
    </p>

    <ProseFirst entry={entry} prose={prose} />

    <Contents entry={entry} />

    {entry.groups.map((group) => (
      <Group key={group.module} group={group} prose={prose} />
    ))}
  </div>
)
