import { MARK_ARMS, MARK_VIEW_BOX } from "@/app/_lib/shell/mark"
import { NOT_FOUND_STYLE } from "@/app/_lib/shell/not-found-style"
import { GEIST_HREF, SHELL_ROOT_CSS } from "@/app/_lib/shell/theme"

/**
 * The one page that belongs to no surface.
 *
 * Each of the four route groups is a root layout of its own (0067), which is
 * what keeps the portal's stylesheet off a marketing page and the documentation's
 * chrome off a lesson. A URL that matches no route is by definition outside all
 * four, and Next supplies the document for it — so this file carries the page
 * and not the document, which is a correction to what it said before.
 *
 * It names the front door and nothing else. Listing the four surfaces here would
 * be a fifth place that has to be kept true as they grow, and the marketing site
 * is already the page whose job is to say what is where.
 *
 * **What changed on 6 October is the dress, not the words.** `Loom marketing`
 * photographed this page serving an address with no route and filed what a
 * visitor got: Times New through `system-ui`, an unstyled heading, a blue
 * underlined link — the only page of the product that gave a confused reader no
 * way to tell they were still on the same site. Every sentence below is the one
 * that was here before. What is new is the house theme, mounted by the shell
 * rather than by a root primitive, and the mark.
 *
 * **A theme and no primitive registry**, which is the question the filing asked
 * and is recorded as 0232. A surface composes registered primitives into a tree
 * and lets the root primitive mount the theme for it. The shell has no tree: it
 * draws this markup and mounts the theme the way any host drawing its own frame
 * does (0197). Borrowing the product's vocabulary of appearance while composing
 * none of its content is what keeps this page from becoming the fifth surface
 * the paragraph above refuses.
 */
const NotFound = () => (
  <>
    {/*
     * Hoisted to the head by React rather than placed in a document this file
     * renders, because the document is Next's. `precedence` is what asks for
     * the hoist; without it the rules land wherever they are written, and a page
     * that rendered its own `<html>` to hold them put it *inside* Next's — where
     * only the HTML parser's error recovery got the theme onto the page at all.
     *
     * Two blocks, one element. `SHELL_ROOT_CSS` is the mounted theme and
     * `NOT_FOUND_STYLE` is what reads it, and they are concatenated rather than
     * served separately so there is no order in which one can arrive without
     * the other.
     */}
    <title>Not found · Loom</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link rel="stylesheet" href={GEIST_HREF} precedence="default" />
    <style
      href="loom-shell-not-found"
      precedence="default"
      dangerouslySetInnerHTML={{ __html: `${SHELL_ROOT_CSS}\n${NOT_FOUND_STYLE}` }}
    />

    <div className="not-found">
      {/*
       * The mark is a link to the front door and the heading is not, so a
       * reader who understands a wordmark gets the exit twice and a reader who
       * does not is told in words further down.
       */}
      <a className="not-found__brand" href="/">
        <svg className="not-found__mark" viewBox={MARK_VIEW_BOX} aria-hidden="true" focusable="false">
          {MARK_ARMS.map((arm) => (
            <rect key={`${arm.x},${arm.y}`} x={arm.x} y={arm.y} width={arm.width} height={arm.height} />
          ))}
        </svg>
        Loom
      </a>

      <main className="not-found__message">
        <h1 className="not-found__heading">Not found</h1>
        <p className="not-found__prose">There is nothing at this address.</p>
        <a className="not-found__way-out" href="/">
          Back to the start
        </a>
      </main>
    </div>
  </>
)

export default NotFound
