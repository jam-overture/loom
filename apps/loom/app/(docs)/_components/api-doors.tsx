import Link from "next/link"

import { grouped } from "@/app/(docs)/_components/api-reference"
import { apiDoorsFor, type ApiAudience, type ApiDoor, type ApiDoorway } from "@/app/(docs)/_lib/api/doors"

/**
 * The front door of the reference: sixteen imports on one screen.
 *
 * Furniture rather than content, in the sense 0067 uses — every number and
 * every sentence here comes from the package, and this file only arranges
 * them. What it arranges is the one view the sixteen pages under it cannot
 * give: each of those describes a door from the inside, and a reader standing
 * at one of them has no way to see the set.
 *
 * **Who this is written for.** Somebody who has read that most of the package
 * is behind some other import and does not yet have a name to search for.
 * Search answers *where is this name*; this answers *which import do I write*,
 * and the plain answer — two of the sixteen, unless you are hosting Loom — is
 * the first thing on the page.
 *
 * The order is deliberate and it is the brief's rule about what comes first:
 * the doors, which is the concrete thing a reader came for, and then the shape
 * they make, which is the general rule they would otherwise have to infer from
 * a table of numbers that does not add up.
 */

const AUDIENCES: readonly {
  readonly audience: ApiAudience
  readonly title: string
  readonly blurb: string
}[] = [
  {
    audience: "app",
    title: "If you are building a page",
    blurb:
      "Almost every application writes these and nothing else. The first is the tree and the change model; the second renders one; the third is the library of primitives every example on this site is built from.",
  },
  {
    audience: "host",
    title: "If you are hosting Loom",
    blurb:
      "The parts an application needs once real people are proposing changes to it: where trees are kept, who is allowed to change them, what a model is asked, and what is written down afterwards.",
  },
  {
    audience: "tooling",
    title: "From a terminal, and from your tests",
    blurb: "Not imported by a page. Scaffolding, inspection, and the suites your own storage has to pass.",
  },
]

/**
 * One door: what you write, how much is behind it, and what it is for.
 *
 * Rows rather than a table. The specifier is the longest unbroken string on
 * the page and a phone is 390 pixels wide, so a three-column table of these
 * either scrolls sideways or squeezes the sentence into a column two words
 * across. A row that stacks reads the same at both widths.
 */
const Door = ({ door }: { readonly door: ApiDoor }) => (
  <li className="border-edge border-b py-3 last:border-b-0">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Link
        href={`/docs/api-reference/${door.slug}`}
        className="text-ink font-mono text-[0.8125rem] break-words underline underline-offset-2 hover:no-underline"
      >
        {door.specifier}
      </Link>

      <span className="text-ink-faint shrink-0 font-mono text-xs">
        {grouped(door.publishes)} {door.publishes === 1 ? "name" : "names"}
      </span>
    </div>

    <p className="text-ink-muted mt-1 text-sm leading-relaxed">{door.summary}</p>
  </li>
)

const DoorGroup = ({
  title,
  blurb,
  doors,
}: {
  readonly title: string
  readonly blurb: string
  readonly doors: readonly ApiDoor[]
}) => (
  <section className="mt-10">
    <h2 className="text-ink text-[1.375rem] leading-tight font-bold tracking-tight">{title}</h2>

    <p className="text-ink-muted mt-2 leading-relaxed">{blurb}</p>

    <ul className="not-prose mt-4 list-none pl-0">
      {doors.map((door) => (
        <Door key={door.specifier} door={door} />
      ))}
    </ul>
  </section>
)

/**
 * The thing a table of sixteen numbers does not say, said.
 *
 * A reader who has just read the rows above will try to add them up, and the
 * total they get is bigger than the package. The reason is the fact this band
 * exists for: **the imports do not nest.** They are not slices of a whole that
 * one of them contains — they are sixteen separate doors with a little overlap,
 * and almost every pair of them shares nothing at all.
 *
 * Each reference page says this from its own side, in its own numbers. Saying
 * it once, from outside, is the thing only this page can do: it can name the
 * four pairs that do overlap, and a page describing one door cannot.
 */
const TheyDoNotNest = ({ doorway }: { readonly doorway: ApiDoorway }) => {
  const widest = doorway.doors.filter((door) => door.widest)
  const narrowest = doorway.doors.reduce((least, door) =>
    door.publishes < least.publishes ? door : least
  )
  const [first] = widest

  if (first === undefined) return null

  return (
    <section className="mt-12">
      <h2 className="text-ink text-[1.375rem] leading-tight font-bold tracking-tight">
        No import has everything behind it
      </h2>

      <p className="text-ink-muted mt-2 leading-relaxed">
        The usual shape of a package like this is a big import with the whole library behind it and
        some smaller ones carved out of it for convenience. Loom is not that shape, and the sizes
        above are where it shows: they add up to more than the package publishes, and the biggest one
        is still less than half of it.
      </p>

      <ul className="not-prose text-ink-muted mt-4 space-y-3 text-sm leading-relaxed">
        <li>
          This package publishes{" "}
          <span className="text-ink font-semibold">{grouped(doorway.packageNames)} names</span> in
          all. The widest door,{" "}
          <Link
            href={`/docs/api-reference/${first.slug}`}
            className="text-ink font-mono text-xs underline underline-offset-2 hover:no-underline"
          >
            {first.specifier}
          </Link>
          , publishes {grouped(first.publishes)} of them; the narrowest,{" "}
          <Link
            href={`/docs/api-reference/${narrowest.slug}`}
            className="text-ink font-mono text-xs underline underline-offset-2 hover:no-underline"
          >
            {narrowest.specifier}
          </Link>
          , publishes {grouped(narrowest.publishes)}.
        </li>

        <li>
          There are {doorway.pairs} pairs of imports here, and{" "}
          <span className="text-ink font-semibold">
            {doorway.pairsSharingNothing} of them share no name at all
          </span>
          . A name you cannot find behind one import is not a name that does not exist — it is
          almost certainly behind one you have not opened.
        </li>

        {doorway.overlapping.length === 0 ? null : (
          <li>
            {doorway.overlapping.length === 1
              ? "One pair overlaps:"
              : `The ${doorway.overlapping.length} pairs that do overlap are these:`}{" "}
            {doorway.overlapping.map((pair, index) => (
              <span key={`${pair.a}-${pair.b}`}>
                {index === 0
                  ? ""
                  : index === doorway.overlapping.length - 1
                    ? "; and "
                    : "; "}
                <code className="code-chip font-mono text-xs">{pair.a}</code> and{" "}
                <code className="code-chip font-mono text-xs">{pair.b}</code> share{" "}
                {grouped(pair.names)} {pair.names === 1 ? "name" : "names"}
              </span>
            ))}
            . Where two doors publish one name, it is the same declaration reached two ways, so
            either import gives you the same thing.
          </li>
        )}

        {doorway.collisions.map((collision) => (
          <li key={collision.name}>
            <span className="text-ink font-semibold">
              One name here means two different things.
            </span>{" "}
            <code className="code-chip font-mono text-xs">{collision.name}</code> is published by{" "}
            <code className="code-chip font-mono text-xs">{collision.specifiers[0]}</code> and by{" "}
            <code className="code-chip font-mono text-xs">{collision.specifiers[1]}</code>, and the
            two are different functions that happen to share a name. Searching it finds both, and
            only the signature tells them apart.
          </li>
        ))}

        {doorway.doors
          .filter((door) => door.insideOf !== undefined)
          .map((door) => (
            <li key={door.specifier}>
              <code className="code-chip font-mono text-xs">{door.specifier}</code> is the one import
              here that <em>is</em> part of a bigger one: every name it publishes is behind{" "}
              <code className="code-chip font-mono text-xs">{door.insideOf}</code> as well. It exists
              because it loads far less, which is what a browser bundle cares about.
            </li>
          ))}
      </ul>
    </section>
  )
}

/**
 * Where a reader goes from here, and it is two different readers.
 *
 * One has a name — they read it in a stack trace or a colleague's branch — and
 * wants the page it is on: that is the search box, and it is the only thing on
 * this site that can answer them in one step. The other has not installed
 * anything yet and is on the wrong page entirely.
 */
const FromHere = () => (
  <section
    aria-label="Where to go from here"
    className="border-edge bg-surface-muted mt-12 rounded-lg border px-4 py-4"
  >
    <p className="text-ink-muted text-sm leading-relaxed">
      <span className="text-ink font-semibold">Looking for one particular name?</span> The search at
      the top of the page indexes every export in the list above and says which import each one comes
      from — which is the fastest way through a package whose doors do not nest.
    </p>

    <p className="text-ink-muted mt-3 text-sm leading-relaxed">
      <span className="text-ink font-semibold">Not installed it yet?</span>{" "}
      <Link
        href="/docs/getting-started/installation"
        className="text-ink underline underline-offset-2 hover:no-underline"
      >
        Installation
      </Link>{" "}
      has the one command, the peers you may also need, and this same list of imports described for
      somebody who has not met any of them.
    </p>
  </section>
)

/**
 * What the page is, in the two sentences a reader meets before the list.
 *
 * Here rather than in the route, and that is the point of it: the words on a
 * generated page have to live somewhere the search index can read them, and
 * what the index reads is what this component returns (`_lib/api/body.tsx`
 * says why). A paragraph left in the route would be a sentence on the site that
 * the site cannot find — which is the state every sentence on this page was in
 * until 26 September.
 *
 * Counted rather than spelled, for the reason `nav.ts` gives about the heading:
 * *"one of sixteen imports"* is a true sentence today and a false one the
 * morning a seventeenth door opens, and nothing would go red.
 */
const Lead = ({ doorway }: { readonly doorway: ApiDoorway }) => (
  <>
    <p className="text-lg">
      Loom is one package. What you write at the top of a file is one of {doorway.doors.length}{" "}
      imports, and which one you write decides what your program loads — so they are worth two
      minutes before you pick.
    </p>

    <p>
      Every name behind them is read from the package itself rather than written here, which is why
      the counts below are exact: {doorway.doors.length} imports, {grouped(doorway.packageNames)}{" "}
      names, and a page for each import saying what comes out of it.
    </p>
  </>
)

export const ApiDoors = ({ doorway }: { readonly doorway: ApiDoorway }) => (
  <>
    <Lead doorway={doorway} />

    {AUDIENCES.map((group) => {
      const doors = apiDoorsFor(doorway, group.audience)

      /* A package with nothing for one of the three audiences prints no heading
         for it, rather than a heading over an empty list. */
      return doors.length === 0 ? null : (
        <DoorGroup key={group.audience} title={group.title} blurb={group.blurb} doors={doors} />
      )
    })}

    <TheyDoNotNest doorway={doorway} />

    <FromHere />
  </>
)
