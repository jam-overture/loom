import { describe, expect, it } from "vitest"

import { guardedRoots, propertiesNamedIn, remPx, rootProperties, soleDeclaration } from "./chrome-css"

/**
 * The reader itself, against stylesheets written for the purpose.
 *
 * The claims about the real chrome are in `chrome.test.ts`, beside the module
 * that names its classes. These are the cases that reader has to get right for
 * those claims to mean anything — including the two it is supposed to refuse,
 * because a reader that guesses is worse than no reader at all when what it is
 * guessing about is whether a number is still correct.
 */
const SHEET = `
@layer base {
  :root {
    --edge: #d4d4d9;
    --chrome-header: 3.5rem;
  }

  [data-theme="dark"] {
    --edge: #2b2b31;
  }

  /* A comment quoting the old spellings: top-14, and calc(100vh - 3.5rem). */
  :root {
    --chrome-inset: calc(var(--chrome) + var(--chrome-clearance));
  }

  html {
    scroll-padding-top: var(--chrome-inset);
  }

  @media (width >= theme(--breakpoint-xl)) {
    :root {
      --chrome-bar-band: 0px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
}
`

describe("the properties the stylesheet declares on :root", () => {
  it("reads every one of them, from each block that declares any", () => {
    const declared = rootProperties(SHEET)

    expect(declared.get("--chrome-header")).toBe("3.5rem")
    expect(declared.get("--chrome-inset")).toBe("calc(var(--chrome) + var(--chrome-clearance))")
  })

  /* The dark theme redeclares the palette and nothing about the chrome, so a
     reader that swept every block would report two values for one name. */
  it("leaves the theme's own block out, which redeclares colours and no heights", () => {
    expect(rootProperties(SHEET).get("--edge")).toBe("#d4d4d9")
  })

  it("says so rather than reporting an empty chrome when there is no :root at all", () => {
    expect(() => rootProperties("html { color: red; }")).toThrow(/declares nothing on :root/)
  })

  /*
   * The chrome has a second configuration above 1280 and this is not it. A
   * reader that swept the guarded block in too would hand back `0px` for
   * `--chrome-bar-band` and call it the value, which is the one answer that is
   * wrong at both widths.
   */
  it("leaves a block a media query guards out of what the page is at every width", () => {
    expect(rootProperties(SHEET).has("--chrome-bar-band")).toBe(false)
  })
})

describe("the :root blocks a media query guards", () => {
  it("is the condition as written, so a query asking the theme can be told from one with a number in it", () => {
    const guarded = guardedRoots(SHEET)

    expect(guarded).toHaveLength(1)
    expect(guarded[0]?.condition).toBe("(width >= theme(--breakpoint-xl))")
    expect(guarded[0]?.properties.get("--chrome-bar-band")).toBe("0px")
  })

  /* The reduced-motion query in the sheet above guards `html`, not `:root`. */
  it("is none of the queries that redeclare no custom property", () => {
    expect(guardedRoots(SHEET).map((found) => found.condition)).not.toContain("(prefers-reduced-motion: reduce)")
  })

  it("finds a query whose body holds braces, which is every query holding a block", () => {
    const nested = "@media (min-width: 40rem) { html { color: red; } :root { --a: 1px; } }\n:root { --a: 2px; }"

    expect(guardedRoots(nested)[0]?.properties.get("--a")).toBe("1px")
    expect(rootProperties(nested).get("--a")).toBe("2px")
  })

  it("says so rather than guessing when a query is not closed", () => {
    expect(() => guardedRoots("@media (min-width: 40rem) { :root { --a: 1px; }")).toThrow(/is not closed/)
  })

  it("is empty where the sheet has no query at all", () => {
    expect(guardedRoots(":root { --a: 1px; }")).toEqual([])
  })
})

describe("the one value a property is given", () => {
  it("is returned as written, so an expression can be held as an expression", () => {
    expect(soleDeclaration(SHEET, "scroll-padding-top")).toBe("var(--chrome-inset)")
  })

  /* The comment in the sheet above quotes `3.5rem` and `top-14`; a reader that
     did not strip comments would find the prose about the old spellings. */
  it("does not read a number out of the prose about it", () => {
    expect(soleDeclaration(SHEET, "--chrome-header")).toBe("3.5rem")
  })

  it("refuses a property declared twice, rather than picking the first", () => {
    const twice = ":root { --a: 1rem; }\nhtml { scroll-padding-top: 1rem; }\nbody { scroll-padding-top: 2rem; }"

    expect(() => soleDeclaration(twice, "scroll-padding-top")).toThrow(/declares scroll-padding-top 2 times/)
  })

  it("refuses a property declared nowhere", () => {
    expect(() => soleDeclaration(SHEET, "scroll-margin-top")).toThrow(/0 times/)
  })

  /* `margin-top` is the end of `scroll-margin-top`, and the heading rule has
     one of those. Asking for the short name must not find the long one. */
  it("does not match the tail of a longer property's name", () => {
    expect(() => soleDeclaration("h2 { scroll-margin-top: 3rem; }", "margin-top")).toThrow(/0 times/)
  })
})

describe("the properties a string reads", () => {
  it("names each one a class list asks the browser for", () => {
    expect(propertiesNamedIn("h-[var(--chrome-bar)] lg:top-[var(--chrome-under-header)]")).toEqual([
      "--chrome-bar",
      "--chrome-under-header",
    ])
  })

  it("names a property once however many times it is read", () => {
    expect(propertiesNamedIn("calc(var(--a) + var( --a ))")).toEqual(["--a"])
  })

  it("names none where a class carries its own number", () => {
    expect(propertiesNamedIn("h-14 lg:top-14")).toEqual([])
  })
})

describe("a length in rem", () => {
  it("is pixels at the root font size, which is what every other number here is in", () => {
    expect(remPx("10rem")).toBe(160)
    expect(remPx(" 0.625rem ")).toBe(10)
  })

  /* Each of these is a value the chrome really does declare somewhere, and the
     answer for all three is the same: this is not the reader for it. */
  it("refuses what it cannot be sure of, rather than answering", () => {
    expect(() => remPx("calc(var(--chrome) + 1px)")).toThrow(/not a plain rem length/)
    expect(() => remPx("1px")).toThrow(/not a plain rem length/)
    expect(() => remPx("calc(100vh - 3.5rem)")).toThrow(/not a plain rem length/)
  })
})
