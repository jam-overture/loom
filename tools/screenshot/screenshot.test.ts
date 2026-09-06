import { describe, expect, it } from "vitest"

import { bestChromium, executableIn, parseChromiumDirectory } from "./browser.js"
import { planShots, shotListSchema, VIEWPORTS } from "./plan.js"

/** What the sandbox image this was written against actually carries. */
const INSTALLED = ["chromium", "chromium-1194", "chromium_headless_shell-1194", "ffmpeg-1011"]

describe("finding the installed browser", () => {
  it("reads a build number off an install directory", () => {
    expect(parseChromiumDirectory("chromium-1194")).toEqual({
      directory: "chromium-1194",
      build: 1194,
      full: true,
    })
  })

  it("tells the headless shell from the full browser", () => {
    expect(parseChromiumDirectory("chromium_headless_shell-1194")?.full).toBe(false)
  })

  it("is not fooled by a directory that is not a Chromium", () => {
    expect(parseChromiumDirectory("ffmpeg-1011")).toBe(null)
    /** No build number, so nothing to point at — the versioned ones are the real installs. */
    expect(parseChromiumDirectory("chromium")).toBe(null)
  })

  it("prefers the full browser over the shell when the image carries both", () => {
    expect(bestChromium(INSTALLED)?.directory).toBe("chromium-1194")
  })

  it("does not depend on the order the directory is read in", () => {
    expect(bestChromium([...INSTALLED].reverse())?.directory).toBe("chromium-1194")
  })

  it("takes the newest build of the browser it prefers", () => {
    const names = ["chromium-1194", "chromium-1210", "chromium_headless_shell-1300"]

    expect(bestChromium(names)?.build).toBe(1210)
  })

  /**
   * The version is the image's and not this repository's, so the one thing this
   * must not do is know a number. An image that moves to a build nobody here has
   * heard of still resolves.
   */
  it("resolves a build this repository has never seen", () => {
    expect(bestChromium(["chromium-9999"])?.build).toBe(9999)
  })

  it("reports nothing rather than guessing when no Chromium is installed", () => {
    expect(bestChromium(["ffmpeg-1011", "firefox-1489"])).toBe(null)
  })

  it("points at the executable each kind of build actually has", () => {
    const full = parseChromiumDirectory("chromium-1194")
    const shell = parseChromiumDirectory("chromium_headless_shell-1194")
    if (!full || !shell) throw new Error("both are Chromium directories")

    expect(executableIn("/opt/pw-browsers", full)).toBe(
      "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    )
    expect(executableIn("/opt/pw-browsers", shell)).toBe(
      "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"
    )
  })
})

const listOf = (source: unknown) => {
  const parsed = shotListSchema.safeParse(source)
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "))

  return parsed.data
}

describe("planning a shot list", () => {
  it("resolves a path against the base URL", () => {
    const planned = planShots(
      listOf({
        baseUrl: "http://localhost:3000",
        outDir: "reports",
        shots: [{ path: "/the-record", out: "record" }],
      })
    )

    expect(planned[0]?.url).toBe("http://localhost:3000/the-record")
    expect(planned[0]?.file).toBe("reports/record.png")
  })

  it("does not double a slash between the base and the path", () => {
    const planned = planShots(
      listOf({ baseUrl: "http://localhost:3000/", shots: [{ path: "/x", out: "x" }] })
    )

    expect(planned[0]?.url).toBe("http://localhost:3000/x")
  })

  it("leaves an absolute address alone, so one list can mix two origins", () => {
    const planned = planShots(
      listOf({
        baseUrl: "http://localhost:3000",
        shots: [{ path: "http://localhost:8123/specimen.html", out: "specimen" }],
      })
    )

    expect(planned[0]?.url).toBe("http://localhost:8123/specimen.html")
  })

  it("keeps an extension the shot already has rather than adding a second", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "already.png" }] }))

    expect(planned[0]?.file).toBe("./already.png")
  })

  it("resolves a named viewport to the size every lane's reports already use", () => {
    const planned = planShots(
      listOf({
        shots: [
          { path: "/x", out: "phone", viewport: "phone" },
          { path: "/x", out: "wide", viewport: "wide" },
        ],
      })
    )

    expect(planned[0]?.viewport).toEqual(VIEWPORTS.phone)
    expect(planned[1]?.viewport).toEqual(VIEWPORTS.wide)
  })

  it("takes an explicit size for the shot a name does not cover", () => {
    const planned = planShots(
      listOf({ shots: [{ path: "/x", out: "x", viewport: { width: 768, height: 1024 } }] })
    )

    expect(planned[0]?.viewport).toEqual({ width: 768, height: 1024 })
  })

  it("defaults to the wide viewport and a viewport-sized shot", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "x" }] }))

    expect(planned[0]?.viewport).toEqual(VIEWPORTS.wide)
    expect(planned[0]?.fullPage).toBe(false)
  })

  it("carries a wait condition through, and omits it when there is none", () => {
    const planned = planShots(
      listOf({
        shots: [
          { path: "/portal", out: "a", waitFor: "h1" },
          { path: "/portal", out: "b" },
        ],
      })
    )

    expect(planned[0]?.waitFor).toBe("h1")
    expect(planned[1] && "waitFor" in planned[1]).toBe(false)
  })

  /**
   * A shot list is input — written by a run minutes earlier — so the failure
   * worth preventing is the misspelled key that photographs the wrong thing
   * without saying anything.
   */
  it("refuses a list with no shots in it", () => {
    expect(shotListSchema.safeParse({ shots: [] }).success).toBe(false)
  })

  it("refuses a viewport name it does not have", () => {
    expect(
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", viewport: "tablet" }] }).success
    ).toBe(false)
  })

  it("refuses a shot with nowhere to write itself", () => {
    expect(shotListSchema.safeParse({ shots: [{ path: "/x" }] }).success).toBe(false)
  })

  it("refuses a base that is not a URL", () => {
    expect(
      shotListSchema.safeParse({ baseUrl: "localhost:3000", shots: [{ path: "/x", out: "x" }] })
        .success
    ).toBe(false)
  })
})
