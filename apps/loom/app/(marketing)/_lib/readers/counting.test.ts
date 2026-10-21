import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { err } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID } from "@jam-overture/loom/store"

import { memoryIngestKeyStore } from "@/app/_lib/reader-signals/keys-memory"
import { mintIngestKey, type IngestKeyStore } from "@/app/_lib/reader-signals/keys"
import { INTAKE_KEY } from "@/app/_lib/reader-signals/settings"

import { treeFor } from "../builders"
import { renderSitePage, renderTree } from "../render"
import { DEFAULT_THEME, HOME, WHAT_YOU_RUN } from "../site"

import { readerSignalUrl, readersCountedHere } from "./counting"

/**
 * Whether this deployment counts its readers, and the two things that answer
 * has to keep in step.
 *
 * The switch itself is one line, and the reason it gets a test file is the
 * second half of this: the same boolean puts the addresses on the markup and
 * mounts the broadcaster that would send them somewhere. Those coming apart is
 * the failure with no symptom — a page carrying every address with nothing
 * listening, or a broadcaster started against a page that names none of its
 * parts.
 */

const ORIGIN = "https://loom.example"

/** A deployment that has minted the key its pages would post with. */
const keyed = async (): Promise<IngestKeyStore> => {
  const keys = memoryIngestKeyStore()
  await keys.put(DEFAULT_APPLICATION_ID, mintIngestKey(), 1)

  return keys
}

const on = { [INTAKE_KEY]: "on" } as const

/**
 * A page, rendered for a deployment that is counting its readers or one that
 * is not.
 *
 * **Told rather than threaded, as of 21 October.** This passed `counting` on
 * the page *context* until today, which is how the setting came to be a field
 * on three types that no node read. Whether a page carries the addresses is a
 * render option, so that is what a caller who already knows the answer hands
 * over.
 *
 * **That the option wins over the deployment is held rather than assumed**, by
 * *carries the tree's address* below: these tests run with the switch unset, so
 * a render that consulted the deployment instead of the answer it was given
 * would come back with no address on it at all.
 */
const markup = async (addressed: boolean): Promise<string> =>
  renderToStaticMarkup(
    (await renderSitePage(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }, { addressed })).element
  )

const readersPage = async (addressed: boolean): Promise<string> =>
  renderToStaticMarkup(
    (await renderSitePage(WHAT_YOU_RUN, { origin: ORIGIN, theme: DEFAULT_THEME }, { addressed }))
      .element
  )

describe("the switch this site reads", () => {
  it("is on for every value the endpoint accepts as on", async () => {
    const keys = await keyed()

    for (const value of ["on", "true", "1", "yes", "ON", " on "]) {
      expect(await readersCountedHere({ [INTAKE_KEY]: value }, keys), value).toBe(true)
    }
  })

  it("is off when nothing is set, which is what a deployment gets by default", async () => {
    expect(await readersCountedHere({}, await keyed())).toBe(false)
  })

  it("is off for every value the endpoint accepts as off", async () => {
    const keys = await keyed()

    for (const value of ["off", "false", "0", "no", ""]) {
      expect(await readersCountedHere({ [INTAKE_KEY]: value }, keys), value).toBe(false)
    }
  })

  /**
   * A value that is neither is reported to the operator as a mistake and keeps
   * no batch, so a page claiming to count you on the strength of it would be
   * claiming something this deployment does not do.
   */
  it("is off for a value that is neither on nor off", async () => {
    const keys = await keyed()

    expect(await readersCountedHere({ [INTAKE_KEY]: "maybe" }, keys)).toBe(false)
    expect(await readersCountedHere({ [INTAKE_KEY]: "yes please" }, keys)).toBe(false)
  })

  it("reads the endpoint's own key and no other", async () => {
    expect(await readersCountedHere({ LOOM_SIGNALS: "on" }, await keyed())).toBe(false)
    expect(INTAKE_KEY).toBe("LOOM_SIGNAL_INTAKE")
  })

  /**
   * **The switch is asked first, and the table only if it said yes.**
   *
   * A deployment that never asked for reader signals should not be reading a
   * key table on every request to be told something the environment already
   * said. Asserted by counting the reads rather than by reading the two lines
   * and agreeing they are in that order.
   *
   * **A store that throws is not the way to assert this**, and the first draft
   * of this test was. `siteSignalUrl` reads through `readWithin`, which turns a
   * refusal — a throw included — into `unavailable`, so a sentinel that threw
   * was caught, read as *no key*, and the answer came back `false` either way.
   * The test passed against a version that asked the table first, which is the
   * exact arrangement it was written to forbid.
   */
  it("does not ask the key table anything on a deployment that is switched off", async () => {
    let reads = 0
    const counted: IngestKeyStore = {
      ...memoryIngestKeyStore(),
      keyOf: (applicationId) => {
        reads += 1

        return memoryIngestKeyStore().keyOf(applicationId)
      },
    }

    expect(await readersCountedHere({}, counted)).toBe(false)
    expect(await readerSignalUrl({}, counted)).toBeNull()
    expect(reads, "reads of the key table on a deployment that collects nothing").toBe(0)
  })
})

/**
 * **The half this site got wrong until 20 October**, filed by portal steering
 * the day the door started refusing every delivery it cannot name (0298).
 *
 * The switch was the whole of the answer `render.ts` read, and the key was a
 * second condition `layout.tsx` applied on its own. So a deployment with
 * `LOOM_SIGNAL_INTAKE=on` and no key minted served every page carrying the
 * addresses a signal names, with no broadcaster on any of them: 6.4 KB of
 * addresses on the front door, 6.1 on `/how-it-works` and 3.6 on
 * `/what-you-run`, read by nobody.
 *
 * Nothing was broken, nothing was red, and the only instrument that could have
 * seen it was a reader of the page source.
 */
describe("the switch on, with nowhere to post", () => {
  it("counts nobody when no key has been minted", async () => {
    expect(await readersCountedHere(on, memoryIngestKeyStore())).toBe(false)
    expect(await readerSignalUrl(on, memoryIngestKeyStore())).toBeNull()
  })

  it("counts nobody when the key table cannot be read", async () => {
    const down: IngestKeyStore = {
      ...memoryIngestKeyStore(),
      keyOf: () => Promise.resolve(err({ code: "unavailable" as const, detail: "no database" })),
    }

    expect(await readersCountedHere(on, down)).toBe(false)
  })

  it("counts its readers once the key exists", async () => {
    expect(await readersCountedHere(on, await keyed())).toBe(true)
  })

  /**
   * The boolean and the URL are the same fact, which is the whole reason they
   * are one function: `render.ts` takes the boolean and `layout.tsx` takes the
   * URL, and a page addressed by one with no broadcaster from the other is the
   * state this file exists to prevent.
   */
  it("answers the renderer and the layout from one read", async () => {
    for (const [name, env, keys] of [
      ["off, no key", {}, memoryIngestKeyStore()],
      ["off, keyed", {}, await keyed()],
      ["on, no key", on, memoryIngestKeyStore()],
      ["on, keyed", on, await keyed()],
    ] as const) {
      const url = await readerSignalUrl(env, keys)

      expect(await readersCountedHere(env, keys), name).toBe(url !== null)
    }
  })
})

/**
 * **Both callers ask the one function**, which is a fact about which module
 * each of them reaches for and is therefore read off their source.
 *
 * It is here because the fix above does not hold on its own. `readerSignalUrl`
 * being the only place the two halves meet is worth nothing if a caller goes
 * round it: `readers/key.ts` is still exported, still answers *is there a key*,
 * and a layout that asked it directly would mount a broadcaster on a
 * deployment that had switched counting **off** and happened to hold a key —
 * posting every batch into a refusal, on pages carrying no addresses to
 * name. That is this bug the other way up, and it survived every one of this
 * route group's 1,472 tests when it was planted.
 *
 * A render is covered by the assertions above, because `renderSitePage` is
 * reachable from a test. The layout is an async server component that mounts a
 * client one, so what it reads is checked here rather than rendered.
 */
describe("who asks", () => {
  const layout = readFileSync(fileURLToPath(new URL("../../layout.tsx", import.meta.url)), "utf8")

  /** Comments stripped, because the reasoning in that file names both modules. */
  const code = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

  it("the layout takes the switch and the key as one answer", () => {
    expect(code).toContain("readerSignalUrl")
    expect(code).toContain("await readerSignalUrl()")
  })

  it("the layout does not reach the key on its own", () => {
    expect(code).not.toContain("siteSignalUrl")
    expect(code).not.toContain("readers/key")
  })

  /**
   * And does not re-read the switch beside it, which is the shape this file
   * replaced: `readersCountedHere() ? await siteSignalUrl() : null`, two
   * functions and a condition the renderer did not share.
   */
  it("the layout does not read the switch a second time", () => {
    expect(code).not.toContain("INTAKE_KEY")
    expect(code).not.toContain("readIntakeSwitch")
  })
})

describe("the page a counting deployment serves", () => {
  it("carries the tree's address, which is what a signal names", async () => {
    const page = await markup(true)

    expect(page).toContain("data-loom-tree=")
    expect(page).toContain("data-loom-revision=")
    expect(page).toContain("data-loom-node=")
    expect(page).toContain("data-loom-type=")
  })

  /**
   * A deployment that has not asked to count anybody gets back the page this
   * site served before any of this existed: not one of the four addresses,
   * anywhere in it.
   *
   * `data-loom-disclosed` survives and is deliberately not in this list. It is
   * not an address — it is how a disclose control says which state it is in, on
   * every deployment, whether or not anything is reading it — and asserting its
   * absence would be asserting that a question on this site stops working when
   * counting is off.
   */
  it("carries no address at all when nobody is being counted", async () => {
    const page = await markup(false)

    for (const attribute of ["tree", "revision", "node", "type"]) {
      expect(page, attribute).not.toContain(`data-loom-${attribute}=`)
    }
  })

  /**
   * **A tree rendered by anything but `renderSitePage` is not addressed.**
   *
   * `renderTree` read the switch for its default until 20 October, and that is
   * the line the finding above is about: the question is now a row in a table
   * and a synchronous default could only ask the half of it that is an
   * environment variable. Off is the safe way round — an unaddressed page costs
   * a signal nobody was listening for, and an addressed one makes a claim about
   * the deployment that the layout may be about to contradict.
   *
   * Asserted with the switch set, because that is the state in which the old
   * default and this one disagree.
   */
  it("is not addressed by a render that was not told whether to be", () => {
    const before = process.env[INTAKE_KEY]
    process.env[INTAKE_KEY] = "on"

    try {
      const page = renderToStaticMarkup(
        renderTree(treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }), { origin: ORIGIN })
          .element
      )

      expect(page).not.toContain("data-loom-node=")
    } finally {
      if (before === undefined) delete process.env[INTAKE_KEY]
      else process.env[INTAKE_KEY] = before
    }
  })

  /**
   * **The site makes no claim about whether counting is on, in either state.**
   *
   * It made two until 12 October: a line in the footer when counting was on,
   * and a sentence on `/what-you-run` saying which of the two deployments you
   * were reading. Both were written when every page was rebuilt per request,
   * so both tracked the setting for free.
   *
   * They stopped being free when the pages became stored rows (0259): a
   * sentence about the current setting freezes at the moment it is written and
   * is false from the first time anybody changes it — and *nobody reading this
   * page has been counted* is the worst of the two to be wrong about. The
   * maintainer's instruction was to take the message off the site whether it
   * is counting or not.
   *
   * **What is not removed is the explanation.** `/what-you-run` still has its
   * *what this page counts* section, which is true of a Loom page whatever any
   * deployment has switched on, and that is what the footer line used to point
   * at. Asserted below so that dropping the pointer cannot quietly become
   * dropping the subject.
   */
  it("makes no claim about whether counting is switched on, either way", async () => {
    for (const counting of [true, false]) {
      const page = await markup(counting)

      expect(page, `footer, counting=${counting}`).not.toContain("never counts who you are")
      expect(page, `footer, counting=${counting}`).not.toContain("counts which of its parts")

      const readers = await readersPage(counting)

      expect(readers, `readers page, counting=${counting}`).not.toContain(
        "nobody reading this page has been counted"
      )
      expect(readers, `readers page, counting=${counting}`).not.toContain(
        "Counting is switched on here"
      )
    }
  })

  it("still explains what a page is able to count, on the page that is about it", async () => {
    for (const counting of [true, false]) {
      expect(await readersPage(counting), `counting=${counting}`).toContain(
        "what a page is able to count"
      )
    }
  })
})
