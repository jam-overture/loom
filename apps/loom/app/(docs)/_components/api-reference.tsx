import Link from "next/link"

import type { EntryProse, ProseMention } from "@/app/(docs)/_lib/api/mentions"
import {
  apiAnchorFor,
  apiSymbolCount,
  type ApiEntry,
  type ApiGroup,
  type ApiKind,
  type ApiNameCollision,
  type ApiNarrowerDoor,
  type ApiOverlappingDoor,
  type ApiRequirement,
  type ApiSymbol,
} from "@/app/(docs)/_lib/api/model"
import { packageOf } from "@/app/(docs)/_lib/packages"

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
  /*
   * `data-search="off"`: the names are not this page's prose.
   *
   * What is in here is a name, its signature and the sentence its author left
   * on the declaration — and the search index answers a name from the index of
   * published names, which carries every one of them with its import beside it.
   * Letting a thousand of them into this page's body as well would put the page
   * above the export a reader typed letter-for-letter, which is the same
   * argument `search/prose.ts` makes for leaving a backticked name out of a
   * written page's body. The bands above this are argued prose and are indexed.
   */
  <section
    id={apiGroupAnchor(group.module)}
    data-search="off"
    className="scroll-mt-24"
  >
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
 * What has to be installed before the import at the top of this page will run.
 *
 * First on the page, above everything about what comes out of the door,
 * because it is the only thing here that can stop a reader before they have
 * started. A reader who pastes an import and gets a stack trace does not go
 * looking for a paragraph further down; they conclude the package is broken.
 *
 * **Two strengths, and the difference is stated rather than implied.** A
 * package the import *loads* is a package whose absence throws — that sentence
 * is worth the plainest words the page has. A package only the *types* name
 * costs a reader nothing at runtime and everything at their keyboard, and
 * telling them the same thing about both would make the strong one mean less.
 *
 * **The band is there when there is nothing to install**, for the reason the
 * band below it is there when no page names anything: a reader told that this
 * import needs nothing stops wondering, and a reader shown no band at all
 * cannot tell that from a site that never checked.
 */
const Requirement = ({ requirement }: { readonly requirement: ApiRequirement }) => (
  <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <code className="code-chip font-mono text-sm">{requirement.package}</code>
    <code className="text-ink-faint font-mono text-xs">{requirement.range}</code>
    <span className="text-ink-faint text-xs">
      {requirement.optional ? "optional peer dependency" : "peer dependency"}
    </span>
  </li>
)

const LoadedRequirements = ({
  specifier,
  loaded,
}: {
  readonly specifier: string
  readonly loaded: readonly ApiRequirement[]
}) => (
  <>
    <p className="text-ink text-sm">
      <span className="font-semibold">Install {loaded.length === 1 ? "this" : "these"} first.</span>{" "}
      <span className="text-ink-muted">
        <code className="code-chip font-mono text-xs">{specifier}</code> loads{" "}
        {loaded.length === 1 ? "it" : "them"} the moment the import runs. Without{" "}
        {loaded.length === 1 ? "it" : "them"}, the import itself fails — before any of your own code
        has run.
      </span>
    </p>

    <ul className="mt-3 space-y-1">
      {loaded.map((requirement) => (
        <Requirement key={requirement.package} requirement={requirement} />
      ))}
    </ul>

    <pre className="border-edge bg-code-surface text-code-ink mt-3 overflow-x-auto rounded-lg border p-3 font-mono text-[0.8125rem]">
      {`pnpm add ${loaded.map((requirement) => requirement.package).join(" ")}`}
    </pre>
  </>
)

const DeclaredRequirements = ({
  declared,
  alone,
}: {
  readonly declared: readonly ApiRequirement[]
  readonly alone: boolean
}) => (
  <div className={alone ? "" : "border-edge mt-4 border-t pt-4"}>
    <p className="text-ink text-sm">
      <span className="font-semibold">
        Your program runs without {declared.length === 1 ? "this one" : "these"}. Your type-checker
        will not.
      </span>{" "}
      <span className="text-ink-muted">
        Nothing this import loads reaches{" "}
        {declared.length === 1 ? "it" : "them"} — the mention is in the types, which are gone by the
        time the code runs. Install {declared.length === 1 ? "it" : "them"} to write against this
        import; skip {declared.length === 1 ? "it" : "them"} and the import still works.
      </span>
    </p>

    <ul className="mt-3 space-y-1">
      {declared.map((requirement) => (
        <Requirement key={requirement.package} requirement={requirement} />
      ))}
    </ul>
  </div>
)

const BeforeItWillRun = ({ entry }: { readonly entry: ApiEntry }) => {
  const loaded = entry.requires.filter((requirement) => requirement.reach === "loaded")
  const declared = entry.requires.filter((requirement) => requirement.reach === "declared")

  return (
    <section
      aria-label="What to install before this import will run"
      className="border-edge bg-surface-muted mt-8 rounded-lg border px-4 py-4"
    >
      {entry.requires.length === 0 ? (
        <p className="text-ink text-sm">
          <span className="font-semibold">Nothing to install first.</span>{" "}
          <span className="text-ink-muted">
            Everything this import loads arrives with{" "}
            <code className="code-chip font-mono text-xs">{packageOf(entry.specifier)}</code>{" "}
            itself.
          </span>
        </p>
      ) : null}

      {loaded.length === 0 ? null : <LoadedRequirements specifier={entry.specifier} loaded={loaded} />}

      {declared.length === 0 ? null : (
        <DeclaredRequirements declared={declared} alone={loaded.length === 0} />
      )}
    </section>
  )
}

/**
 * The door a reader should have gone through instead, where there is one.
 *
 * The band above this one answers *will my import run*. This answers the
 * question a reader asks straight after, and which nothing on this site could
 * answer before: *should I be importing this one at all*. A package with
 * sixteen entry points can have two doors onto the same code, and a reader who
 * takes the shorter specifier is not making a mistake they could have seen.
 *
 * **It says nothing when there is nothing to say, and that is a deliberate
 * difference from the two bands around it.** Those announce an empty result —
 * *nothing to install first*, *no written page names any of this* — because a
 * reader arrives already wondering and deserves to know the site checked.
 * Nobody arrives wondering whether a narrower door exists; they have not been
 * told the idea yet. Printing *no narrower door* on the fifteen pages that have
 * none would teach a reader a concept and withdraw it in the same sentence,
 * fifteen times.
 *
 * **Only one direction.** The wide door's page carries it and the narrow one's
 * does not. A reader standing at the narrow door already has the cheap import;
 * telling them a wider one exists would be an invitation to pay for exports
 * they have not asked for, which is the cost this band was written to stop.
 */
const NarrowerDoor = ({
  door,
  entry,
}: {
  readonly door: ApiNarrowerDoor
  readonly entry: ApiEntry
}) => (
  <div className="mt-3 first:mt-0">
    <p className="text-ink-muted text-sm leading-relaxed">
      <Link
        href={`/docs/api-reference/${door.slug}`}
        className="text-ink font-mono text-xs underline underline-offset-2 hover:no-underline"
      >
        {door.specifier}
      </Link>{" "}
      publishes {door.shared} of the {apiSymbolCount(entry)} exports below — the same names, declared
      the same way. It does not load{" "}
      {door.avoids.map((name, index) => (
        <span key={name}>
          {index === 0 ? "" : index === door.avoids.length - 1 ? " or " : ", "}
          <code className="code-chip font-mono text-xs">{name}</code>
        </span>
      ))}
      , which this import does, and its JavaScript goes through {door.files} of the package's built
      files where this one goes through {entry.files}.
    </p>
  </div>
)

const NarrowerDoors = ({ entry }: { readonly entry: ApiEntry }) =>
  entry.narrower.length === 0 ? null : (
    <section
      aria-label="Narrower imports onto part of this one"
      className="border-edge mt-8 rounded-lg border px-4 py-4"
    >
      <p className="text-ink text-sm font-semibold">
        {entry.narrower.length === 1 ? "A narrower door opens" : "Narrower doors open"} onto part of
        this one.
      </p>

      <p className="text-ink-muted mt-1 text-sm">
        If that is all you came for, import it instead and your program never loads the rest.
      </p>

      <div className="mt-3">
        {entry.narrower.map((door) => (
          <NarrowerDoor key={door.specifier} door={door} entry={entry} />
        ))}
      </div>
    </section>
  )

/**
 * What is *not* behind this door, which is most of the package.
 *
 * This is the one band on the page that corrects a reader rather than
 * informing them. The other three answer questions somebody arrived with; this
 * one answers a question nobody thinks to ask, because the belief underneath it
 * is so ordinary that a reader has no reason to doubt it: **the short specifier
 * is the whole library and the longer ones are slices of it.**
 *
 * It is wrong here. `@jam-overture/loom` is the largest of the sixteen doors and
 * publishes less than half the names the package publishes; thirteen of the
 * fifteen others publish not one name it does. The sixteen do not nest. A
 * reader holding the ordinary belief looks for a name behind the root import,
 * does not find it, and concludes the name does not exist — and nothing on this
 * site told them otherwise, because every page here described one door and the
 * rail listed them flat.
 *
 * **It is on every page**, unlike the narrower-door band above it, and for the
 * opposite reason. That one teaches an idea a reader has not met, so printing
 * it where it has nothing to say would be noise. This one *unteaches* one they
 * are likely to have arrived with, and which of the sixteen pages they arrived
 * at is not knowable from here.
 */
const OverlappingDoors = ({
  doors,
  publishes,
}: {
  readonly doors: readonly ApiOverlappingDoor[]
  readonly publishes: number
}) => {
  const total = doors.reduce((count, door) => count + door.names, 0)

  return (
    <p className="text-ink-muted mt-3 text-sm leading-relaxed">
      {/*
       * "Every one" is measured rather than assumed, and it is the sentence
       * `@jam-overture/loom/signals/broadcast` needs: all fourteen of its names are
       * behind `@jam-overture/loom/signals` as well, so a headline claiming this
       * import is nobody's slice would be false on exactly that page.
       */}
      {total === publishes ? "Every one of these names is published" : "Some of these names are published"}{" "}
      elsewhere too:{" "}
      {doors.map((door, index) => (
        <span key={door.specifier}>
          {index === 0 ? "" : index === doors.length - 1 ? " and " : ", "}
          {door.names} by{" "}
          <Link
            href={`/docs/api-reference/${door.slug}`}
            className="text-ink font-mono text-xs underline underline-offset-2 hover:no-underline"
          >
            {door.specifier}
          </Link>
        </span>
      ))}
      {total === 1
        ? " — the same declaration reached through two doors, so either import gives you the same thing."
        : " — the same declarations reached through two doors, so either import gives you the same thing."}
    </p>
  )
}

/**
 * One name, two doors, two different things — said plainly, because search
 * cannot say it.
 *
 * A reader who searches `horizonOf` gets two results with two import
 * specifiers beside them, which reads exactly like one export offered at two
 * doors. It is not: one is about the window a reader signal falls in and the
 * other is about how long telemetry is kept. The signatures differ and nothing
 * else does.
 *
 * Exactly one name in this package is in that state, which is what makes it
 * worth a sentence rather than a policy. The measurement that finds it is the
 * same one that counts the overlaps above, so if a second ever appears, it
 * appears here.
 */
const Collisions = ({ collisions }: { readonly collisions: readonly ApiNameCollision[] }) => (
  <p className="text-ink-muted border-edge mt-4 border-t pt-4 text-sm leading-relaxed">
    <span className="text-ink font-semibold">
      {collisions.length === 1
        ? "One name here means something else behind another door."
        : `${collisions.length} of these names mean something else behind another door.`}
    </span>{" "}
    {collisions.map((collision, index) => (
      <span key={`${collision.name}-${collision.specifier}`}>
        {index === 0 ? "" : " "}
        <code className="code-chip font-mono text-xs">{collision.name}</code> is published by{" "}
        <Link
          href={`/docs/api-reference/${collision.slug}`}
          className="text-ink font-mono text-xs underline underline-offset-2 hover:no-underline"
        >
          {collision.specifier}
        </Link>{" "}
        as well, and it is declared differently there — the same name, not the same thing.
      </span>
    ))}{" "}
    {collisions.length === 1
      ? "Searching the name finds both, and only the signature tells them apart."
      : "Searching one of them finds both doors, and only the signature tells them apart."}
  </p>
)

/**
 * A four-digit count, grouped.
 *
 * `1,071` rather than `1071`, because the whole force of the sentence it sits
 * in is a ratio and a reader has to take the size of both numbers in at a
 * glance. Fixed to `en-US` rather than left to the reader's locale: this is a
 * server-rendered page in an English document, and a number that formatted one
 * way on the server and another in the browser is a hydration mismatch rather
 * than a courtesy.
 */
export const grouped = (count: number): string => count.toLocaleString("en-US")

const WhereThisDoorSits = ({ entry }: { readonly entry: ApiEntry }) => {
  const { standing } = entry
  const publishes = apiSymbolCount(entry)
  const elsewhere = standing.packageNames - publishes

  /* One door is a package with nothing to compare it to, and this band is
     entirely a comparison. Loom has sixteen; a package that grew down to one
     should lose the band rather than render a sentence about no other doors. */
  if (standing.otherDoors === 0 || elsewhere === 0) return null

  return (
    <section
      aria-label="How much of this package is behind other imports"
      className="border-edge bg-surface-muted mt-8 rounded-lg border px-4 py-4"
    >
      <p className="text-ink text-sm">
        <span className="font-semibold">
          {standing.widest
            ? "No import here has everything behind it — not even this one."
            : "No import here has everything behind it."}
        </span>{" "}
        <span className="text-ink-muted">
          <code className="code-chip font-mono text-xs">{entry.specifier}</code> publishes{" "}
          {grouped(publishes)} of the {grouped(standing.packageNames)} names this package publishes
          {standing.widest && publishes * 2 < standing.packageNames
            ? " — more than any other import, and still less than half"
            : ""}
          . The other {grouped(elsewhere)} are behind one of the {standing.otherDoors} other imports, and{" "}
          {standing.doorsSharingNothing === standing.otherDoors
            ? "not one of those imports publishes a single name this one does"
            : `${standing.doorsSharingNothing} of those ${standing.otherDoors} publish nothing this one does`}
          . The imports do not nest: a name that is not on this page is not a name that does not
          exist, and the search at the top of the page says which import it comes from.
        </span>
      </p>

      {standing.sharedWith.length === 0 ? null : (
        <OverlappingDoors doors={standing.sharedWith} publishes={publishes} />
      )}

      {standing.collisions.length === 0 ? null : <Collisions collisions={standing.collisions} />}
    </section>
  )
}

/**
 * The list of what is on the page, before the page starts.
 *
 * A reference is read by people who arrived looking for one name, and a rail
 * that stops at the page title leaves them scrolling. This is the second half
 * of the navigation and it belongs to the page rather than to the chrome,
 * because it is different on every one of them.
 */
const Contents = ({ entry }: { readonly entry: ApiEntry }) => (
  /* `data-search="off"`: a page's own table of contents is navigation, and every
     module title in it is already findable as the heading it links to. */
  <nav
    aria-label="On this page"
    data-search="off"
    className="border-edge mt-8 rounded-lg border px-4 py-4"
  >
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
        {/* `data-search="off"`: a list of links to pages is navigation, and each
            page in it is already in the search index under its own title. The
            sentences around it are this band's argument and are indexed. */}
        <ul data-search="off" className="mt-3 space-y-1">
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
  <>
    {/*
     * The page's own opening paragraph, here rather than in the route.
     *
     * It is outside the barrier below because it is prose and is styled as the
     * article's prose — the same paragraph in the same place as before it moved.
     * What moving it buys is that the search index can read it: what the index
     * holds for a generated page is the words this component returns, and a
     * paragraph left in the route would be a sentence the site cannot find.
     * `_lib/api/body.tsx` carries the argument.
     */}
    <p>
      Everything below is exported from that import. The names, the signatures and the sentences are
      read from the package itself rather than written here, so this page says what the copy of Loom
      in your <code>node_modules</code> says — and it changes in the same pull request the code does.
    </p>

    <div className="not-prose">
      <p className="text-ink-faint mt-6 text-sm">
        {apiSymbolCount(entry)} exports, in {entry.groups.length}{" "}
        {entry.groups.length === 1 ? "module" : "modules"}. Generated from{" "}
        <code className="code-chip font-mono text-xs">{entry.types}</code>, which is the declaration
        file this package publishes for{" "}
        <code className="code-chip font-mono text-xs">{entry.specifier}</code>.
      </p>

      <BeforeItWillRun entry={entry} />

      <NarrowerDoors entry={entry} />

      <WhereThisDoorSits entry={entry} />

      <ProseFirst entry={entry} prose={prose} />

      <Contents entry={entry} />

      {entry.groups.map((group) => (
        <Group key={group.module} group={group} prose={prose} />
      ))}
    </div>
  </>
)
