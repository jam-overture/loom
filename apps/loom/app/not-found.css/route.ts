import { NOT_FOUND_STYLE } from "@/app/_lib/shell/not-found-style"
import { SHELL_ROOT_CSS } from "@/app/_lib/shell/theme"

/**
 * The dress for the page that belongs to no surface, served rather than carried.
 *
 * `not-found-style.ts` says why this is a route at all: the root not-found
 * boundary sits in the RSC tree of every route, so anything its fallback renders
 * is serialised into the flight payload of every response on all four surfaces.
 * A `<style>` put 7,263 bytes there twice per page; a `<link>` puts ~90.
 *
 * **Two blocks, one response.** `SHELL_ROOT_CSS` is the mounted theme and
 * `NOT_FOUND_STYLE` is what reads it, concatenated in that order so there is no
 * sequence in which one can arrive without the other — the property the inlined
 * `<style>` had, kept by serving them together rather than by two links.
 *
 * `force-static` because the body is a pure function of the shell's theme, which
 * is fixed when the application is built: there is nothing in a request for this
 * to read, so it is prerendered once and costs no server time. The theme still
 * reaches it through `SHELL_ROOT_CSS` — the palette remains the single source
 * (0049, 0334) and this file names no colour of its own.
 */
export const dynamic = "force-static"

/**
 * Revalidated rather than immutable, because the address carries no content
 * hash and the body changes with the shell's theme on a deploy. A stale copy
 * here would dress a 404 in the previous palette, and the request it costs is
 * one conditional GET on the one page nobody is meant to reach.
 */
const HEADERS = {
  "content-type": "text/css; charset=utf-8",
  "cache-control": "public, max-age=0, must-revalidate",
} as const

export const GET = (): Response => new Response(`${SHELL_ROOT_CSS}\n${NOT_FOUND_STYLE}`, { headers: HEADERS })
