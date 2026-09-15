import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { SUBMIT_PROP_KEY, THEME_PROP_KEY } from "../../src/reserved-props.js"
import { buildElement, buildSlot, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { describeArgsError, parseSpecimenArgs } from "./args.js"
import {
  browsersRoot,
  chromiumCandidates,
  describeBrowserError,
  locateChromium,
} from "./browser.js"
import {
  captureShots,
  describeShot,
  overflows,
  type CaptureTarget,
  type Shot,
  type SpecimenBrowser,
  type SpecimenPage,
} from "./capture.js"
import exampleSpecimen from "./example.specimen.js"
import { escapeHtml, specimenDocument } from "./page.js"
import { planPages, planShots, shotsAt, slug } from "./plan.js"
import {
  chromiumBrowser,
  contextOptionsFor,
  describeLauncherError,
  LAUNCH_ARGS,
  loadChromium,
  playwrightSearchPaths,
  type ChromiumLauncher,
  type ContextOptions,
  type LaunchOptions,
} from "./playwright.js"
import { describeRenderError, renderSpecimen } from "./render.js"
import { contentTypeFor, resolveServedPath, serveDirectory } from "./serve.js"
import { defineSpecimen, PHONE, WIDE, type Specimen } from "./specimen.js"

const selection = (palette: string): ThemeSelection =>
  themeSelectionSchema.parse({ palette, fontPack: "editorial-serif", stylePreset: "comfortable" })

const specimenOf = (overrides: Partial<Specimen> = {}): Specimen =>
  defineSpecimen({
    name: "A Band",
    title: "A band",
    build: (theme) => {
      const idFactory = sequentialIdFactory()
      const heading = buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1 },
        children: [buildText(idFactory, "Hello")],
      })
      const page = buildElement(idFactory, {
        type: "loom.page",
        props: { [THEME_PROP_KEY]: theme },
        children: [heading],
      })
      return createTree(page, idFactory)
    },
    themes: [{ label: "Editorial serif", selection: selection("editorial") }],
    ...overrides,
  })

describe("naming what a run will produce", () => {
  it("slugs a label written as prose, because every label reaches a file name", () => {
    expect(slug("Editorial serif")).toBe("editorial-serif")
    expect(slug("1280 (wide)")).toBe("1280-wide")
    expect(slug("--edges--")).toBe("edges")
  })

  it("plans one page per theme, because a theme is what changes the markup", () => {
    const pages = planPages(
      specimenOf({
        themes: [
          { label: "Editorial", selection: selection("editorial") },
          { label: "Bold", selection: selection("bold") },
        ],
      })
    )

    expect(pages.map((page) => page.file)).toEqual(["a-band-editorial.html", "a-band-bold.html"])
  })

  it("plans one shot per theme and viewport, and reuses the page across viewports", () => {
    const shots = planShots(specimenOf())

    expect(shots.map((shot) => shot.file)).toEqual([
      "a-band-editorial-serif-phone.png",
      "a-band-editorial-serif-wide.png",
    ])
    expect(new Set(shots.map((shot) => shot.page.file)).size).toBe(1)
  })

  it("takes the phone and the laptop when a specimen declares no viewports", () => {
    expect(planShots(specimenOf()).map((shot) => shot.viewport)).toEqual([PHONE, WIDE])
  })

  it("takes only the viewports a specimen declares when it declares any", () => {
    const shots = planShots(specimenOf({ viewports: [PHONE] }))

    expect(shots).toHaveLength(1)
    expect(shots[0]?.viewport.width).toBe(390)
  })
})

describe("the document a specimen is photographed inside", () => {
  it("escapes a title, which is prose a lane wrote", () => {
    expect(escapeHtml('a & b <c> "d"')).toBe("a &amp; b &lt;c&gt; &quot;d&quot;")
  })

  it("declares the charset and the viewport, without which a phone shot is a lie", () => {
    const html = specimenDocument({ title: "A band", markup: "<p>x</p>" })

    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1"')
  })

  it("resets the body margin, which otherwise puts eight pixels round every band", () => {
    expect(specimenDocument({ title: "t", markup: "" })).toContain("body{margin:0")
  })

  it("carries the markup verbatim and adds no styling of its own", () => {
    const html = specimenDocument({ title: "t", markup: '<div class="loom-card">x</div>' })

    expect(html).toContain('<div class="loom-card">x</div>')
    expect(html).not.toMatch(/font-family|background/)
  })
})

describe("finding the browser that is already on disk", () => {
  it("prefers the unversioned entry, which is the one that cannot go stale", () => {
    const candidates = chromiumCandidates("/browsers", ["chromium", "chromium-1194"])

    expect(candidates[0]).toBe("/browsers/chromium")
  })

  it("takes the highest build when there is no unversioned entry", () => {
    const candidates = chromiumCandidates("/browsers", ["chromium-1194", "chromium-1301"])

    expect(candidates).toEqual([
      "/browsers/chromium-1301/chrome-linux/chrome",
      "/browsers/chromium-1194/chrome-linux/chrome",
    ])
  })

  it("names no build number of its own, so a new image needs no edit here", () => {
    expect(chromiumCandidates("/browsers", [])).toEqual([])
  })

  it("reaches the headless shell only after every headed Chromium", () => {
    const candidates = chromiumCandidates("/browsers", [
      "chromium_headless_shell-1194",
      "chromium-1194",
    ])

    expect(candidates).toEqual([
      "/browsers/chromium-1194/chrome-linux/chrome",
      "/browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
    ])
  })

  it("reads PLAYWRIGHT_BROWSERS_PATH before its own default", () => {
    expect(browsersRoot({ PLAYWRIGHT_BROWSERS_PATH: "/elsewhere" })).toBe("/elsewhere")
    expect(browsersRoot({})).toBe("/opt/pw-browsers")
  })

  it("says which root it could not read, rather than failing at launch", async () => {
    const located = await locateChromium("/no/such/browsers")

    expect(located.ok).toBe(false)
    expect(!located.ok && located.error.code).toBe("no-browsers-root")
    expect(!located.ok && describeBrowserError(located.error)).toContain("PLAYWRIGHT_BROWSERS_PATH")
  })

  it("lists what it tried when the root holds no Chromium", async () => {
    const root = await mkdtemp(join(tmpdir(), "specimen-browsers-"))
    try {
      const located = await locateChromium(root)

      expect(!located.ok && located.error.code).toBe("no-chromium")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe("serving the pages", () => {
  let root = ""
  let origin = ""
  let close: () => Promise<void> = async () => {}

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "specimen-serve-"))
    await writeFile(join(root, "a-band.html"), "<p>served</p>", "utf8")
    const server = await serveDirectory(root)
    origin = server.origin
    close = server.close
  })

  afterAll(async () => {
    await close()
    await rm(root, { recursive: true, force: true })
  })

  it("serves a page over http, because an image URL may not be file: or data:", async () => {
    const response = await fetch(`${origin}/a-band.html`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(await response.text()).toBe("<p>served</p>")
  })

  it("answers 404 rather than hanging, which is how a wrong file name presents", async () => {
    expect((await fetch(`${origin}/missing.html`)).status).toBe(404)
  })

  it("keeps a request inside the served directory", () => {
    expect(resolveServedPath("/pages", "/a-band.html")).toBe("/pages/a-band.html")
    /** An absolute request collapses its own `..`, so this is the served file. */
    expect(resolveServedPath("/pages", "/../../etc/passwd")).toBe("/pages/etc/passwd")
    expect(resolveServedPath("/pages", "../secret")).toBeUndefined()
    /** A sibling directory whose name starts with the root's is not inside it. */
    expect(resolveServedPath("/pages", "../pages-other/x")).toBeUndefined()
  })

  it("refuses a malformed escape rather than throwing inside the request handler", () => {
    expect(resolveServedPath("/pages", "/%zz.html")).toBeUndefined()
  })

  it("types a png as a png, so a served specimen can carry one", () => {
    expect(contentTypeFor("/x/y.png")).toBe("image/png")
    expect(contentTypeFor("/x/y.bin")).toBe("application/octet-stream")
  })
})

const describeTarget = (file: string, target: CaptureTarget): string => {
  if (target.clip !== undefined) return `${file} (clipped to ${target.clip})`
  return target.fullPage ? file : `${file} (viewport only)`
}

const fakeBrowser = (
  measurements: readonly { scrollWidth: number; innerWidth: number }[]
): {
  browser: SpecimenBrowser
  visited: string[]
  written: string[]
  /** Every step, and every measurement, in the order the loop reached them. */
  journal: string[]
} => {
  const visited: string[] = []
  const written: string[] = []
  const journal: string[] = []
  let opened = 0

  const browser: SpecimenBrowser = {
    open: async (): Promise<SpecimenPage> => {
      const measurement = measurements[opened] ?? { scrollWidth: 390, innerWidth: 390 }
      opened += 1

      return {
        goto: async (url, waitFor) => {
          visited.push(waitFor === undefined ? url : `${url} after ${waitFor}`)
        },
        act: async (steps) => {
          for (const step of steps) {
            journal.push("click" in step ? `click ${step.click}` : `wait ${step.wait}`)
          }
        },
        measure: async () => {
          journal.push("measure")
          return measurement
        },
        capture: async (file, target) => {
          written.push(describeTarget(file, target))
        },
        close: async () => {},
      }
    },
    close: async () => {},
  }

  return { browser, visited, written, journal }
}

/** A shot at an address, with the defaults `shoot` gives one. */
const shotAt = (overrides: Partial<Shot> = {}): Shot => ({
  name: "a-shot",
  url: "http://127.0.0.1:1234/page",
  file: "a-shot.png",
  viewport: WIDE,
  do: [],
  fullPage: false,
  ...overrides,
})

describe("taking the shots", () => {
  it("visits every planned page and writes every planned file under the out directory", async () => {
    const { browser, visited, written } = fakeBrowser([])

    const results = await captureShots(
      shotsAt("http://127.0.0.1:1234", planShots(specimenOf())),
      browser,
      { outDir: "reports" }
    )

    expect(visited).toEqual([
      "http://127.0.0.1:1234/a-band-editorial-serif.html",
      "http://127.0.0.1:1234/a-band-editorial-serif.html",
    ])
    expect(written).toEqual([
      "reports/a-band-editorial-serif-phone.png",
      "reports/a-band-editorial-serif-wide.png",
    ])
    /** A composition is photographed whole; only an address shoots a viewport. */
    expect(written.every((file) => !file.includes("viewport only"))).toBe(true)
    expect(results.map((result) => result.overflowed)).toEqual([false, false])
  })

  it("flags the page that is wider than the phone, and still takes its picture", async () => {
    const { browser, written } = fakeBrowser([{ scrollWidth: 1420, innerWidth: 390 }])

    const [phone] = await captureShots(
      shotsAt("http://127.0.0.1:1234", planShots(specimenOf({ viewports: [PHONE] }))),
      browser,
      { outDir: "reports" }
    )

    expect(phone?.overflowed).toBe(true)
    expect(written).toHaveLength(1)
  })

  it("closes the page even when the page will not load", async () => {
    let closed = 0
    const browser: SpecimenBrowser = {
      open: async () => ({
        goto: async () => {
          throw new Error("net::ERR_CONNECTION_REFUSED")
        },
        act: async () => {},
        measure: async () => ({ scrollWidth: 0, innerWidth: 0 }),
        capture: async () => {},
        close: async () => {
          closed += 1
        },
      }),
      close: async () => {},
    }

    await expect(
      captureShots(shotsAt("http://x", planShots(specimenOf())), browser, { outDir: "reports" })
    ).rejects.toThrow("ERR_CONNECTION_REFUSED")
    expect(closed).toBe(1)
  })

  it("runs a shot's steps after the load and before the shutter", async () => {
    const { browser, journal, written } = fakeBrowser([])

    await captureShots(
      [shotAt({ do: [{ click: "[data-open]" }, { wait: 400 }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal).toEqual(["click [data-open]", "wait 400", "measure"])
    expect(written).toEqual(["reports/a-shot.png (viewport only)"])
  })

  /**
   * A disclosure that opens or a list that grows is exactly the kind of thing
   * that pushes a page past the phone, so measuring the page the load produced
   * would report the width of something nobody is looking at.
   */
  it("measures the page the steps produced, not the one the load did", async () => {
    const { browser, journal } = fakeBrowser([{ scrollWidth: 1420, innerWidth: 390 }])

    const [result] = await captureShots(
      [shotAt({ viewport: PHONE, do: [{ click: "[data-open]" }] })],
      browser,
      { outDir: "reports" }
    )

    expect(journal.indexOf("click [data-open]")).toBeLessThan(journal.indexOf("measure"))
    expect(result?.overflowed).toBe(true)
  })

  it("never touches the page when a shot has no steps", async () => {
    const { browser, journal } = fakeBrowser([])

    await captureShots([shotAt()], browser, { outDir: "reports" })

    expect(journal).toEqual(["measure"])
  })

  it("points the shutter at one element when a shot clips", async () => {
    const { browser, written } = fakeBrowser([])

    await captureShots([shotAt({ clip: "[data-figure]" })], browser, { outDir: "reports" })

    expect(written).toEqual(["reports/a-shot.png (clipped to [data-figure])"])
  })

  it("reports a shot as one line a report can paste", () => {
    expect(
      describeShot({
        name: "a-band-editorial-phone",
        file: "reports/a-band-editorial-phone.png",
        viewport: PHONE,
        overflow: { scrollWidth: 1420, innerWidth: 390 },
        overflowed: true,
      })
    ).toBe("a-band-editorial-phone  390x844@2x  scrollWidth 1420 / innerWidth 390  ← overflows")
  })

  it("calls a page wider than its viewport an overflow and nothing narrower", () => {
    expect(overflows({ scrollWidth: 391, innerWidth: 390 })).toBe(true)
    expect(overflows({ scrollWidth: 390, innerWidth: 390 })).toBe(false)
  })
})

describe("the browser adapter", () => {
  const recordingLauncher = (): {
    launcher: ChromiumLauncher
    launches: LaunchOptions[]
    contexts: ContextOptions[]
    screenshots: { path: string; fullPage: boolean }[]
    waits: string[]
    selectors: string[]
    /** Steps and evaluations, in the order the adapter reached them. */
    journal: string[]
    elementShots: { selector: string; path: string }[]
  } => {
    const launches: LaunchOptions[] = []
    const contexts: ContextOptions[] = []
    const screenshots: { path: string; fullPage: boolean }[] = []
    const waits: string[] = []
    const selectors: string[] = []
    const journal: string[] = []
    const elementShots: { selector: string; path: string }[] = []

    return {
      launches,
      contexts,
      screenshots,
      waits,
      selectors,
      journal,
      elementShots,
      launcher: {
        launch: async (options) => {
          launches.push(options)
          return {
            newContext: async (contextOptions) => {
              contexts.push(contextOptions)
              return {
                newPage: async () => ({
                  goto: async (_url: string, options: { waitUntil: "load" }) => {
                    waits.push(options.waitUntil)
                  },
                  waitForSelector: async (selector: string) => {
                    selectors.push(selector)
                  },
                  evaluate: async <TValue,>(body: () => TValue): Promise<TValue> => {
                    journal.push(`evaluate ${body.name}`)
                    return { scrollWidth: 390, innerWidth: 390 } as TValue
                  },
                  click: async (selector: string) => {
                    journal.push(`click ${selector}`)
                  },
                  waitForTimeout: async (ms: number) => {
                    journal.push(`wait ${ms}`)
                  },
                  locator: (selector: string) => ({
                    screenshot: async (options: { path: string }) => {
                      elementShots.push({ selector, path: options.path })
                    },
                  }),
                  screenshot: async (options: { path: string; fullPage: boolean }) => {
                    screenshots.push(options)
                  },
                }),
                close: async () => {},
              }
            },
            close: async () => {},
          }
        },
      },
    }
  }

  it("launches the executable it was given, with the flag Chromium needs as root", async () => {
    const recorder = recordingLauncher()

    await chromiumBrowser(recorder.launcher, "/browsers/chromium")

    expect(recorder.launches).toEqual([
      { executablePath: "/browsers/chromium", args: LAUNCH_ARGS },
    ])
    expect(LAUNCH_ARGS).toContain("--no-sandbox")
    /** A long full-page shot dies partway through the container's small /dev/shm. */
    expect(LAUNCH_ARGS).toContain("--disable-dev-shm-usage")
  })

  it("opens a context at a true viewport, at 2x, with motion reduced", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")

    await browser.open(PHONE)

    expect(recorder.contexts).toEqual([
      { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" },
    ])
  })

  it("reduces motion for every viewport, because a revealing band photographs blank", () => {
    expect(contextOptionsFor(WIDE).reducedMotion).toBe("reduce")
  })

  it("waits for load and writes the page to the file it was given", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "a.png")

    await page.goto("http://127.0.0.1:1/a.html")
    await page.capture(file, { fullPage: true })

    expect(recorder.waits).toEqual(["load"])
    expect(recorder.screenshots).toEqual([{ path: file, fullPage: true }])
    expect(recorder.selectors).toEqual([])
  })

  /**
   * The load event resolves before a form driven by `useActionState` has
   * finished submitting, which is how a run photographed a sign-in page
   * believing it was the screen behind it.
   */
  it("waits for the selector a shot names, after the load event", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.goto("http://127.0.0.1:1/portal", "[data-signed-in]")

    expect(recorder.waits).toEqual(["load"])
    expect(recorder.selectors).toEqual(["[data-signed-in]"])
  })

  it("takes a viewport-sized shot when it is asked for one", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "b.png")

    await page.capture(file, { fullPage: false })

    expect(recorder.screenshots).toEqual([{ path: file, fullPage: false }])
  })

  it("drives the steps in the order they were written", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ click: "[data-cta]" }, { wait: 250 }, { click: "[data-question]" }])

    expect(recorder.journal.slice(1)).toEqual([
      "click [data-cta]",
      "wait 250",
      "click [data-question]",
    ])
  })

  /**
   * A click on a real `a[href]` navigates, and every step after it then runs on
   * a different page — the silent wrong picture the harness exists to prevent.
   */
  it("holds the page still before the first step, not after it", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)

    await page.act([{ click: "[data-cta]" }])

    expect(recorder.journal).toEqual(["evaluate pinNavigation", "click [data-cta]"])
  })

  it("photographs the element a clip names, and never the page as well", async () => {
    const recorder = recordingLauncher()
    const browser = await chromiumBrowser(recorder.launcher, "/browsers/chromium")
    const page = await browser.open(WIDE)
    const file = join(await mkdtemp(join(tmpdir(), "loom-shot-")), "c.png")

    await page.capture(file, { fullPage: false, clip: "[data-figure]" })

    expect(recorder.elementShots).toEqual([{ selector: "[data-figure]", path: file }])
    expect(recorder.screenshots).toEqual([])
  })

  it("collects the search paths from both variables, since NODE_PATH is what lanes reach for", () => {
    expect(playwrightSearchPaths({ LOOM_PLAYWRIGHT: "/a", NODE_PATH: "/b:/c" })).toEqual([
      "/a",
      "/b",
      "/c",
    ])
    expect(playwrightSearchPaths({ NODE_PATH: "" })).toEqual([])
  })

  it("says how to install playwright-core rather than throwing, when it is not there", async () => {
    const loaded = await loadChromium(["/no/such/node_modules"])

    expect(loaded.ok).toBe(false)
    if (!loaded.ok) {
      expect(describeLauncherError(loaded.error)).toContain("npm install playwright-core")
      expect(describeLauncherError(loaded.error)).toContain("LOOM_PLAYWRIGHT")
    }
  })
})

describe("the command line", () => {
  it("takes a module and an output directory", () => {
    const parsed = parseSpecimenArgs(["tools/specimen/example.specimen.ts", "--out", "reports/x"])

    expect(parsed.ok && parsed.value).toEqual({
      module: "tools/specimen/example.specimen.ts",
      outDir: "reports/x",
    })
  })

  it("writes into reports/ by default, which is where a report's pictures live", () => {
    const parsed = parseSpecimenArgs(["a.ts"])

    expect(parsed.ok && parsed.value.outDir).toBe("reports")
  })

  it("refuses --out with the next flag as its value", () => {
    const parsed = parseSpecimenArgs(["a.ts", "--out", "--other"])

    expect(!parsed.ok && parsed.error.code).toBe("missing-value")
  })

  it("refuses an unknown flag and a missing module, with the usage line", () => {
    expect(!parseSpecimenArgs(["a.ts", "--zoom"]).ok).toBe(true)
    const empty = parseSpecimenArgs([])
    expect(!empty.ok && describeArgsError(empty.error)).toContain("usage: pnpm specimen")
  })
})

describe("rendering a specimen", () => {
  it("mounts the theme it was built with, so three palettes are three documents", async () => {
    const rendered = await renderSpecimen(
      specimenOf({
        themes: [
          { label: "Editorial", selection: selection("editorial") },
          { label: "Bold", selection: selection("bold") },
        ],
      })
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const [editorial, bold] = rendered.value
    expect(editorial?.html).toContain("--loom-accent")
    expect(editorial?.html).not.toBe(bold?.html)
    expect(rendered.value.every((page) => page.diagnostics.length === 0)).toBe(true)
  })

  it("titles each document with the specimen and the theme it is wearing", async () => {
    const rendered = await renderSpecimen(specimenOf())

    expect(rendered.ok && rendered.value[0]?.html).toContain(
      "<title>A band — Editorial serif</title>"
    )
  })

  it("renders the specimen this repository ships, clean, under all three palettes", async () => {
    const rendered = await renderSpecimen(exampleSpecimen)

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value).toHaveLength(3)
    for (const page of rendered.value) {
      expect(page.diagnostics).toEqual([])
      expect(page.html).toContain("One tree, three palettes, two viewports")
    }
  })
})

describe("wiring a submission into a specimen", () => {
  const formSpecimen = (endpoints?: Specimen["endpoints"]): Specimen =>
    specimenOf({
      build: (theme) => {
        const idFactory = sequentialIdFactory()
        const form = buildElement(idFactory, {
          type: "loom.form",
          props: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
          children: [
            buildElement(idFactory, {
              type: "loom.field",
              props: { name: "email", label: "Email", type: "email", required: true },
              children: [],
            }),
            buildSlot(idFactory, "submit", [
              buildElement(idFactory, {
                type: "loom.button",
                props: { label: "Send", variant: "primary" },
                children: [],
              }),
            ]),
          ],
        })
        const page = buildElement(idFactory, {
          type: "loom.page",
          props: { [THEME_PROP_KEY]: theme },
          children: [form],
        })
        return createTree(page, idFactory)
      },
      ...(endpoints === undefined ? {} : { endpoints }),
    })

  const TARGET = { action: "/contact", method: "post", fields: [] } as const

  /**
   * The state the finding is about: correct, and a photograph in which every
   * control inside the form is six-tenths visible.
   */
  it("greys the whole fieldset when a specimen declares no endpoints", async () => {
    const rendered = await renderSpecimen(formSpecimen())

    expect(rendered.ok).toBe(true)
    const html = (rendered.ok && rendered.value[0]?.html) || ""
    /** The defect, exactly: every control inside is six-tenths visible. */
    expect(html).toContain("<fieldset disabled")
    expect(html).toContain("opacity:0.6")
  })

  it("posts to the target a specimen declared, so the fields are photographable", async () => {
    const rendered = await renderSpecimen(formSpecimen({ "contact.enquiry": TARGET }))

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const html = rendered.value[0]?.html ?? ""
    expect(html).toContain('action="/contact"')
    expect(html).toContain('method="post"')
    expect(html).not.toContain("<fieldset disabled")
    expect(html).not.toContain("opacity:0.6")
  })

  it("renders the hidden fields a target carries, in the order it names them", async () => {
    const rendered = await renderSpecimen(
      formSpecimen({
        "contact.enquiry": {
          ...TARGET,
          fields: [
            { name: "csrf", value: "a-token" },
            { name: "locale", value: "en" },
          ],
        },
      })
    )

    const html = (rendered.ok && rendered.value[0]?.html) || ""
    expect(html.indexOf('name="csrf"')).toBeGreaterThan(-1)
    expect(html.indexOf('name="csrf"')).toBeLessThan(html.indexOf('name="locale"'))
    expect(html).toContain('value="a-token"')
  })

  /**
   * Through `defineEndpoint`, so a specimen's target meets the same schema a
   * host's answer does — an off-origin action is the costliest composition
   * mistake in the seam and the one least likely to be noticed in review.
   */
  it("refuses a target that leaves the origin, exactly as a host's would be", async () => {
    const rendered = await renderSpecimen(
      formSpecimen({ "contact.enquiry": { ...TARGET, action: "//evil.example" } })
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    /** No action reached the markup, and the fieldset is grey again. */
    expect(rendered.value[0]?.html).not.toContain("evil.example")
    expect(rendered.value[0]?.html).toContain("<fieldset disabled")
  })

  it("says which endpoint id it refused rather than rendering half a page", async () => {
    const rendered = await renderSpecimen(formSpecimen({ "Not An Id": TARGET }))

    expect(rendered.ok).toBe(false)
    if (rendered.ok) return

    expect(rendered.error.code).toBe("endpoints")
    expect(describeRenderError(rendered.error)).toContain("Not An Id")
  })

  it("leaves a specimen with no forms in it exactly as it was", async () => {
    const withRegistry = await renderSpecimen(specimenOf({ endpoints: {} }))
    const without = await renderSpecimen(specimenOf())

    expect(withRegistry.ok && without.ok).toBe(true)
    expect(withRegistry.ok && withRegistry.value[0]?.html).toBe(
      without.ok ? without.value[0]?.html : "mismatch"
    )
  })
})
