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
        <code key={`${index}-${part}`} className="font-mono text-[0.85em]">
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

const SymbolEntry = ({ symbol }: { readonly symbol: ApiSymbol }) => (
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

    <Signature symbol={symbol} />

    {symbol.truncated ? (
      <p className="text-ink-faint mt-2 text-xs">
        Cut short here — the whole of it is longer than a page can usefully hold.
      </p>
    ) : null}
  </div>
)

const Group = ({ group }: { readonly group: ApiGroup }) => (
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
        <SymbolEntry key={symbol.name} symbol={symbol} />
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
     * The `block!` is load-bearing — `.prose ul` forces `display: flex`, and a
     * flex container ignores `columns`, so the reset has to win the cascade.
     */}
    <ul className="mt-3 block! sm:columns-2 sm:gap-x-8">
      {entry.groups.map((group) => (
        <li key={group.module} className="flex items-baseline justify-between gap-3 py-0.5">
          <a href={`#${apiGroupAnchor(group.module)}`} className="text-ink hover:text-ink-muted text-sm">
            {group.title}
          </a>
          <span className="text-ink-faint shrink-0 font-mono text-xs">{group.symbols.length}</span>
        </li>
      ))}
    </ul>
  </nav>
)

export const ApiEntryReference = ({ entry }: { readonly entry: ApiEntry }) => (
  <div className="not-prose">
    <p className="text-ink-faint mt-6 text-sm">
      {apiSymbolCount(entry)} exports, in {entry.groups.length}{" "}
      {entry.groups.length === 1 ? "module" : "modules"}. Generated from{" "}
      <code className="font-mono text-xs">{entry.types}</code>, which is the declaration file this
      package publishes for <code className="font-mono text-xs">{entry.specifier}</code>.
    </p>

    <Contents entry={entry} />

    {entry.groups.map((group) => (
      <Group key={group.module} group={group} />
    ))}
  </div>
)
