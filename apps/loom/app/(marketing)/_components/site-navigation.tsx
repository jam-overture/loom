"use client"

import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Moving between this site's pages without loading a new document.
 *
 * A page here is a Loom tree, and the renderer draws its links as plain `<a>`
 * elements, because a tree knows nothing of the framework that hosts it. So
 * until 8 November every click on loomjs.org was a full page load: a new
 * request to the server, a page rendered from scratch, the stylesheet and the
 * fonts checked again, and a blank moment between the two pages. On a fast
 * connection that is still a visible pause.
 *
 * This hands those clicks to Next.js' router instead, and asks the router to
 * fetch every page the current one links to as soon as it has loaded, and
 * again after each move.
 * A click then swaps the page in from memory. Only links to this site's own
 * pages are taken; anything else — the docs and the portal (each its own
 * document), another site, a new tab, a download, a jump within the page — is
 * left to the browser exactly as before.
 */

/** Next.js' own name for a prefetch that fetches the whole page, not only its shell. */
const WHOLE_PAGE = "full" as PrefetchKind

const isPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/** The address a click should be handed to the router with, or nothing. */
export const routedAddressOf = (
  event: MouseEvent,
  location: Location,
  paths: ReadonlySet<string>
): string | undefined => {
  if (event.defaultPrevented || !isPlainClick(event)) return undefined

  const link = event.target instanceof Element ? event.target.closest("a") : null
  const href = link?.getAttribute("href") ?? null

  if (link === null || href === null) return undefined
  if (link.hasAttribute("download")) return undefined
  if (link.target !== "" && link.target !== "_self") return undefined

  const to = new URL(href, location.href)

  if (to.origin !== location.origin || !paths.has(to.pathname)) return undefined
  if (to.pathname === location.pathname && to.search === location.search) return undefined

  return `${to.pathname}${to.search}${to.hash}`
}

/**
 * Every address on this page that a click would hand the router, without its
 * fragment: what to fetch ahead. Read off the links themselves, because they
 * carry the reader's palette (`?theme=`) and a page fetched without it would
 * not be the page the click asks for.
 */
export const routedAddressesIn = (
  page: Document,
  location: Location,
  paths: ReadonlySet<string>
): readonly string[] => {
  const addresses = [...page.querySelectorAll("a[href]")].flatMap((link) => {
    if (link.hasAttribute("download")) return []

    const to = new URL(link.getAttribute("href") ?? "", location.href)
    const elsewhere = to.pathname !== location.pathname || to.search !== location.search

    return to.origin === location.origin && paths.has(to.pathname) && elsewhere
      ? [`${to.pathname}${to.search}`]
      : []
  })

  return [...new Set(addresses)]
}

export const SiteNavigation = ({ paths }: { readonly paths: readonly string[] }) => {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const ours = new Set(paths)

    for (const address of routedAddressesIn(globalThis.document, globalThis.location, ours)) {
      router.prefetch(address, { kind: WHOLE_PAGE })
    }

    const onClick = (event: MouseEvent): void => {
      const address = routedAddressOf(event, globalThis.location, ours)

      if (address === undefined) return

      event.preventDefault()
      router.push(address)
    }

    globalThis.document.addEventListener("click", onClick)

    return () => globalThis.document.removeEventListener("click", onClick)
  }, [paths, pathname, router])

  return null
}
