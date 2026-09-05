import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * Every screen this route group serves, found rather than listed — and the one
 * way to read one.
 *
 * ## Why a test reads source at all
 *
 * A component test renders a component. It cannot see what order a *page* puts
 * its components in, and reading order is the thing that keeps going wrong: a
 * `lg:flex-row-reverse` that reads correctly at 1280px and puts an address book
 * before the thing it addresses at 390px broke no test and was found by a
 * screenshot. Reading the source is crude and it is the only check that catches
 * that without a browser at two widths.
 *
 * ## Why the list is not a list
 *
 * Seven screens grew a `reading-order.test.ts` of their own, each opening with
 * the same eight lines — `readFileSync`, `join(process.cwd(), "app", …)`, and
 * the same comment-stripping regex written out again. The lane filed that as a
 * finding twice and copied it a third time anyway.
 *
 * Sharing those eight lines is the smaller half. The larger half is that a
 * per-screen guard only guards the screens somebody remembered to write one
 * for, and **the screen that ships a defect is by definition the one nobody
 * thought about**. `/portal/trust` had no guard, and it is where the two
 * defects this module's first run found were sitting.
 *
 * So the screens are enumerated from the filesystem, the way the rail's items
 * are checked against it: a new `page.tsx` is inside the portal-wide guard the
 * moment it exists, and there is no list to forget to add it to.
 */

/** Where Next serves this route group from. A group contributes nothing to a URL. */
const GROUP = join(process.cwd(), "app", "(portal)")

/**
 * A path inside this route group, from the segments a reader would name.
 *
 * `join(process.cwd(), "app", "(portal)", "portal", "activity", "page.tsx")` was
 * written out in full in seven files, and the parenthesised group in the middle
 * of it is exactly the sort of literal that gets one character wrong and fails
 * as "file not found" rather than as the rule it was guarding.
 */
export const portalFile = (...segments: readonly string[]): string => join(GROUP, ...segments)

export type Screen = {
  /** The path a reader types, with dynamic segments left as Next writes them. */
  readonly route: string
  /** Absolute path of the `page.tsx` that serves it. */
  readonly file: string
}

const pagesUnder = (directory: string, segments: readonly string[]): readonly Screen[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return pagesUnder(join(directory, entry.name), [...segments, entry.name])
    }

    return entry.name === "page.tsx"
      ? [{ route: `/${segments.join("/")}`, file: join(directory, entry.name) }]
      : []
  })

/**
 * Every screen under `(portal)`, in route order.
 *
 * `_components` and `_lib` are skipped by Next's own convention rather than by
 * this function: a leading underscore takes a directory out of the routing
 * tree, so no `page.tsx` can be under one, and a filter for them here would be
 * a second rule to keep in step with Next's.
 */
export const portalScreens = (): readonly Screen[] =>
  [...pagesUnder(GROUP, [])].sort((left, right) => left.route.localeCompare(right.route))

/**
 * A screen's source with its comments removed.
 *
 * Every one of these guards is written just below a comment naming the very
 * class, word or shape the file must not contain — that is what a warning is —
 * and a check that could not tell a warning from the thing it warns about would
 * make the warning unwriteable. Three screens' guards discovered this
 * separately and wrote the same regex; it is written once here.
 */
export const screenSource = (file: string): string =>
  readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

/**
 * Whether a screen only forwards somewhere else.
 *
 * Five routes in this group render nothing at all: `/portal/trees`,
 * `/portal/calibration`, `/portal/audit` and `/portal/primitives` are 308s kept
 * alive so a link written before a rename still lands, and `/portal/demo` is a
 * sixth pointing out of the group entirely. Every rule about what a reader meets
 * first is vacuous on them, and asserting one anyway would be asserting they
 * have a heading — which they must not.
 *
 * The test is whether the file renders any element, not whether it calls
 * `redirect`. Those are different questions and the difference is `/portal/
 * sign-in`, which calls `redirect` for a visitor who already has a session and
 * renders a real screen for everybody else. A guard keyed on the call would
 * have quietly excused the one page every signed-out visitor lands on.
 */
export const isForwarding = (source: string): boolean => !/<[A-Za-z]/u.test(source)
