import { describe, expect, it } from "vitest"

import { routedAddressesIn, routedAddressOf } from "./site-navigation"

const PATHS = new Set(["/", "/why-use-it", "/what-you-run"])

const at = (href: string): Location => new URL(href) as unknown as Location

const clickOn = (
  html: string,
  init: MouseEventInit = { button: 0, bubbles: true, cancelable: true }
): MouseEvent => {
  document.body.innerHTML = html
  const target = document.body.querySelector("[data-target]") ?? document.body
  const event = new MouseEvent("click", init)

  Object.defineProperty(event, "target", { value: target })

  return event
}

describe("which clicks the router takes", () => {
  const here = at("https://loomjs.org/")

  it("takes a plain click on a link to another page of this site", () => {
    expect(routedAddressOf(clickOn('<a data-target href="/why-use-it">x</a>'), here, PATHS)).toBe(
      "/why-use-it"
    )
  })

  it("takes a click on something inside such a link", () => {
    const event = clickOn('<a href="/what-you-run#costs"><span data-target>x</span></a>')

    expect(routedAddressOf(event, here, PATHS)).toBe("/what-you-run#costs")
  })

  it.each([
    ["the docs, which are another document", '<a data-target href="/docs">x</a>'],
    ["another site", '<a data-target href="https://example.com/">x</a>'],
    ["a new tab", '<a data-target target="_blank" href="/why-use-it">x</a>'],
    ["a download", '<a data-target download href="/why-use-it">x</a>'],
    ["a jump within this page", '<a data-target href="/#chain">x</a>'],
    ["something that is not a link", "<span data-target>x</span>"],
  ])("leaves %s to the browser", (_what, html) => {
    expect(routedAddressOf(clickOn(html), here, PATHS)).toBeUndefined()
  })

  it("leaves a click with a modifier key to the browser", () => {
    const event = clickOn('<a data-target href="/why-use-it">x</a>', {
      button: 0,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    expect(routedAddressOf(event, here, PATHS)).toBeUndefined()
  })

  it("leaves a click somebody else already handled", () => {
    const event = clickOn('<a data-target href="/why-use-it">x</a>')

    event.preventDefault()

    expect(routedAddressOf(event, here, PATHS)).toBeUndefined()
  })
})

describe("what is fetched ahead", () => {
  it("is every other page this one links to, palette included and fragment dropped", () => {
    document.body.innerHTML = [
      '<a href="/why-use-it?theme=minimal">a</a>',
      '<a href="/why-use-it?theme=minimal#for-a-reader">b</a>',
      '<a href="/what-you-run?theme=minimal">c</a>',
      '<a href="/?theme=minimal">this page</a>',
      '<a href="/docs">docs</a>',
      '<a href="https://example.com/">elsewhere</a>',
    ].join("")

    expect(routedAddressesIn(document, at("https://loomjs.org/?theme=minimal"), PATHS)).toEqual([
      "/why-use-it?theme=minimal",
      "/what-you-run?theme=minimal",
    ])
  })
})
