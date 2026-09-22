import { buildElement, buildSlot, type IdFactory, type LoomNode } from "@loom/runtime"

import type { AskId } from "./adapt/asks"
import { PLACEHOLDER_COPY } from "./copy"
import { action, link, prose, stack } from "./nodes"
import {
  askHref,
  DECISIONS_URL,
  HOME,
  internalHref,
  otherThemes,
  PORTAL,
  PRODUCT_SURFACES,
  readingNeighbours,
  REPOSITORY_URL,
  SITE_ROUTES,
  SITE_THEMES,
  surfaceHref,
  WHAT_READERS_DO,
  type SiteRoute,
  type SiteThemeName,
} from "./site"

/**
 * The header and the footer, as nodes.
 *
 * They are in the tree rather than in a layout, and that is the point of the
 * site: if the chrome were markup wrapped around the render, then "the whole
 * page is data" would be true of the middle of the page and false at the top
 * and the bottom of it. A menu item here is a `loom.link`, and the wordmark is
 * a `loom.logo` — both registered primitives a proposal could address, move or
 * re-word like anything else.
 *
 * **It is also the way into the rest of the product.** Marketing, the
 * documentation and the portal are one application (0067) with this surface at
 * its root (0070), so a visitor reaches everything else from here. The header
 * carries the menu and the way in; the footer carries the whole map. Neither
 * knows anything about another route group beyond its front-door path, which is
 * what keeps a link into it correct across whatever that lane does behind it.
 *
 * This is the second version of both. The first composed them out of nested
 * `loom.stack`s holding quiet buttons and filed what that cost as findings
 * against `Loom primitives` — no navigation landmark, no way to say which item
 * is the current page, no named groups in the footer. `loom.nav`, `loom.footer`,
 * `loom.link-list` and `loom.link` came back in #97 answering exactly those, so
 * the workarounds are gone and the findings with them.
 */

/**
 * What the footer says above the palette links.
 *
 * Exported because two test files assert it, and a string spelled out in three
 * places is a string that gets re-worded in one of them. It was "Same tree,
 * another palette:" until 20 August — accurate, and one of our nouns, on the
 * front door.
 */
export const PALETTE_SWITCHER_LABEL = "The same page, a different palette:"

/**
 * The word on the bar's one action, and the way this site names the portal to
 * somebody who has never heard of a portal.
 *
 * Exported for the same reason as the label above, and for one more: the front
 * door's questions band now answers *do I need an account to use this?*, and
 * the sentence that closes the answer is about **this word, in this bar**. A
 * question naming a button by typing its label out again is a question that
 * goes stale the day the button is re-worded, and it would go stale silently —
 * the wrong half of the answer still reads like an answer.
 */
export const SIGN_IN_LABEL = "Sign in"

export type ChromeContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  /** The route being rendered, so the menu can mark it rather than drop it. */
  readonly current: SiteRoute
  /** What the visitor has asked the front door for, when they are on it. */
  readonly ask?: AskId
  readonly approve?: boolean
  /**
   * Whether this deployment is counting the person reading the page, which the
   * foot of every page says when it is.
   *
   * It is in the chrome rather than on one page because it is true of all ten:
   * a broadcaster is started by the layout, so the page a reader happens to
   * have landed on is not the page that decides whether they are counted. A
   * site that counted on ten pages and disclosed on one would be making the
   * argument this site sells in exactly the form it tells a reader not to
   * accept.
   */
  readonly counting?: boolean
}

/**
 * The same page, wearing another palette — and still the page the visitor made.
 *
 * The switcher used to rebuild the route's address from scratch, which quietly
 * threw away whatever the visitor had asked the front door for: change the
 * palette halfway through watching a change and the page snapped back to how it
 * had arrived. That is the worst possible moment to lose it, because the two
 * claims are being made at once — a re-theme touches only the root, and it is
 * the *same* page underneath.
 */
const inAnotherPalette = (context: ChromeContext, palette: SiteThemeName): string =>
  context.current.path === HOME.path
    ? askHref(context.origin, {
        theme: palette,
        ...(context.ask === undefined ? {} : { ask: context.ask, approve: context.approve === true }),
      })
    : internalHref(context.origin, context.current.path, palette)

/**
 * A menu item, and the page the reader is already on says so.
 *
 * The first header left the current route out of its own menu, because nothing
 * in the tree could mark it — a menu that changed length as you walked through
 * the site. `current` emits `aria-current="page"` and pins the underline, which
 * is the accessible fact and the styling in one prop.
 */
const menuLink = (ids: IdFactory, context: ChromeContext, route: SiteRoute): LoomNode =>
  link(ids, route.label, internalHref(context.origin, route.path, context.theme), {
    scale: "medium",
    ...(route.path === context.current.path ? { current: true } : {}),
  })

const wordmark = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.logo",
    props: { name: "Loom", href: internalHref(context.origin, HOME.path, context.theme) },
  })

/**
 * The bar across the top: the mark, the menu, and the one thing the page wants
 * you to do.
 *
 * The menu is the pages and the surfaces marked `inMenu` — today three of this
 * site's five pages, the demonstration and the documentation. The portal is the
 * action rather than a menu item, and its word is **Sign in** rather than its
 * name: a stranger has no idea what a portal is, and the bar's right-hand action
 * is where every site they have used puts the way in.
 *
 * **A bar cannot say whose account it means, and this one was the only place the
 * site said anything about accounts at all.** *Sign in* at the top right of a
 * site a stranger has never used reads as *you may have one of these* — and a
 * portal belongs to the Loom site it is part of, so this site can no more issue
 * one than it can sign you in to somebody else's. Ten seconds is the whole span
 * this bar is for and none of that fits in it, which is an argument for saying
 * it somewhere with room rather than for leaving it unsaid: `PORTAL.door` is
 * the sentence, the front door's questions band and its band of cards carry it,
 * and `SIGN_IN_LABEL` is exported so the question can name this button without
 * spelling it a second time.
 *
 * It used to take *every unguarded surface*, which is a rule about permissions
 * deciding a question about attention, and it grew by one every time another
 * lane shipped a front door. `inMenu` in `site.ts` carries that decision now,
 * with the reasoning beside it; the footer below still carries the complete map,
 * so this bar can be short without anything becoming unreachable.
 *
 * **A page of this site can be left out on the same terms, as of 8 September.**
 * The surfaces answered #166 and the bar was back to eight items within a week,
 * because the flag only governed half of what the bar carries. It governs both
 * halves now, and the guarantee is the one the surfaces already had: what the
 * bar leaves out, the footer's map carries — marked as the page the reader is
 * on, so a page off the bar still says where you are.
 */
export const siteHeader = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.nav",
    props: { tone: "surface", position: "sticky", align: "end" },
    children: [
      buildSlot(ids, "brand", [wordmark(ids, context)]),
      ...SITE_ROUTES.filter((route) => route.inMenu).map((route) => menuLink(ids, context, route)),
      ...PRODUCT_SURFACES.filter((surface) => surface.inMenu).map((surface) =>
        link(ids, surface.label, surfaceHref(context.origin, surface), { scale: "medium" })
      ),
      buildSlot(ids, "actions", [
        action(ids, SIGN_IN_LABEL, surfaceHref(context.origin, PORTAL), {
          variant: "secondary",
          scale: "small",
        }),
      ]),
    ],
  })

const linkGroup = (
  ids: IdFactory,
  label: string,
  links: readonly LoomNode[]
): LoomNode =>
  buildElement(ids, {
    type: "loom.link-list",
    props: { label, direction: "column" },
    children: [...links],
  })

/**
 * What the foot of the page says when this deployment is counting its readers,
 * and says nowhere when it is not.
 *
 * **It is here because it has to be on every page.** The broadcaster is started
 * by the layout, so whichever of the ten pages somebody landed on is counting
 * them, and the one page *about* counting cannot be the only page that mentions
 * it — a reader who never reaches `/what-readers-do` would never have been told.
 * The footer is the band every page ends with and the one that already carries
 * the things that are true of the whole site.
 *
 * **What it may promise is exactly what `asked.ts` asks for**, which is why the
 * sentence names parts rather than people: the bands a reader reached, how long
 * they were on screen, and what they pressed. The second half is the one worth
 * the words — there is nowhere in a signal to put a name, an account or
 * anything that joins one visit to another (0146), so *never who you are* is a
 * property of the record rather than a setting somebody left switched on.
 *
 * The link is the page that says the rest of it, labelled with its own route
 * label so the two cannot drift apart.
 */
const countingNote = (ids: IdFactory, context: ChromeContext): LoomNode =>
  stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
    prose(
      ids,
      "This page counts which of its parts you reach, how long you stay and what you press — and never who you are.",
      { size: "small", tone: "muted" }
    ),
    link(
      ids,
      WHAT_READERS_DO.label,
      internalHref(context.origin, WHAT_READERS_DO.path, context.theme),
      { tone: "muted", scale: "small" }
    ),
  ])

/**
 * The band that closes the page, and the only complete map of the product on
 * it.
 *
 * Three named groups rather than one row of links: `loom.link-list` makes the
 * visible heading and the landmark's accessible name the same string, so a
 * screen reader announces three named groups instead of one anonymous run.
 */
export const siteFooter = (ids: IdFactory, context: ChromeContext): LoomNode =>
  buildElement(ids, {
    type: "loom.footer",
    props: { tone: "plain", columns: "three" },
    children: [
      buildSlot(ids, "brand", [
        wordmark(ids, context),
        prose(ids, "Your AI can change this page. You can see exactly what it changed.", {
          size: "small",
          tone: "muted",
        }),
      ]),
      linkGroup(
        ids,
        "This site",
        SITE_ROUTES.map((route) =>
          link(ids, route.label, internalHref(context.origin, route.path, context.theme), {
            tone: "muted",
            scale: "small",
            ...(route.path === context.current.path ? { current: true } : {}),
          })
        )
      ),
      linkGroup(
        ids,
        "The product",
        PRODUCT_SURFACES.map((surface) =>
          link(ids, surface.label, surfaceHref(context.origin, surface), {
            tone: "muted",
            scale: "small",
          })
        )
      ),
      linkGroup(ids, "The project", [
        link(ids, "Source", REPOSITORY_URL, { tone: "muted", scale: "small", external: true }),
        link(ids, "Decisions", DECISIONS_URL, { tone: "muted", scale: "small", external: true }),
      ]),
      buildSlot(ids, "note", [
        prose(ids, PLACEHOLDER_COPY.licence, { size: "small", tone: "muted" }),
        ...(context.counting === true ? [countingNote(ids, context)] : []),
        /**
         * The re-theme, offered rather than described. Each is an ordinary link
         * to the same route wearing another palette, and what comes back is the
         * same tree with three different ids on its root — which is the whole of
         * what a re-theme is (0049).
         */
        stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
          prose(ids, PALETTE_SWITCHER_LABEL, { size: "small", tone: "muted" }),
          ...otherThemes(context.theme).map((name) =>
            link(
              ids,
              SITE_THEMES[name].label,
              inAnotherPalette(context, name),
              { tone: "muted", scale: "small" }
            )
          ),
        ]),
      ]),
    ],
  })

/**
 * What the two ends of the band are called, and what the band calls itself.
 *
 * Exported for the same reason as the two labels above: three files assert
 * them, and a string spelled in three places is a string that gets re-worded in
 * one of them.
 *
 * The two directions are the shortest plain words that say *which way*. The
 * alternative was an arrow glyph, and an arrow is a picture of a direction
 * rather than a word for it — it is not announced, it is not translated, and on
 * the one site whose whole argument is that it can always say what is going on
 * it would be the only navigation on the page a reader has to infer.
 *
 * The eyebrow is *What to read next* rather than *Keep reading*, because the
 * front door already carries **Keep going** on the band that offers the four
 * surfaces, and two bands one screen apart whose labels are near-synonyms are
 * two bands a reader reads as one.
 */
export const BEFORE_LABEL = "Before this"
export const NEXT_LABEL = "Next"
export const READ_NEXT_EYEBROW = "What to read next"

/**
 * One end of the band: which way it goes, and the page it goes to.
 *
 * The whole card is the link, so nothing inside it may be one: `loom.card`
 * renders an anchor when it is given an `href`, and the Gate refuses an anchor
 * inside an anchor. Both lines are therefore prose — which is right anyway,
 * because neither of them is separately clickable.
 */
const wayOn = (
  ids: IdFactory,
  label: string,
  destination: string,
  href: string,
  blurb?: string
): LoomNode =>
  buildElement(ids, {
    type: "loom.card",
    props: { href, tone: "outline" },
    children: [
      prose(ids, label, { size: "small", tone: "muted" }),
      prose(ids, destination),
      /**
       * Only the hand-off carries one, and the asymmetry is the point: every
       * other card names a page of an argument the reader is in the middle of,
       * and this one names a different surface. A reader who has read all nine
       * and meets a card saying *Docs* has been handed a fourth navigation link;
       * the same card saying what is behind the door has been handed the next
       * thing to do.
       */
      ...(blurb === undefined ? [] : [prose(ids, blurb, { size: "small", tone: "muted" })]),
    ],
  })

/**
 * The band that walks a reader along the site's own argument.
 *
 * It is chrome rather than a page's own band, and that is the whole of why it
 * is worth building: *every page says which page comes next* is a guarantee
 * only if it has no exceptions, and nine of the ten pages were already pointing
 * onward by hand at whichever page their author had in mind. Those hand-picked
 * links are good — they are made in the middle of an argument, where the reason
 * for going somewhere is fresh — and they are not a sequence. `/how-it-works`
 * had none at all, and two pages were the destination of nobody's.
 *
 * So this takes nothing away from a page. It adds the one link a page cannot
 * make for itself, because *what comes next* is a fact about the site's order
 * rather than about the page: `readingNeighbours` reads it off `SITE_ROUTES`,
 * and neither this function nor any page builder knows which page it is.
 *
 * **It is a grid of cards and it was meant to be `loom.link-pager`**, which is
 * the primitive written for exactly this and is the one thing in the starter
 * library this site still does not use. Two things stopped it, both measured
 * against `next start` and both filed for `Loom primitives` on 22 September:
 * its two end regions are `flex: 0 0 auto` and all the slack goes to the region
 * holding the numbers — which a prev/next pair does not have — so at 1280 the
 * two ends sit at the band's edges with 900px of nothing between them; and
 * `loom.card` carries `container-type: inline-size`, so a card put in an end
 * region has no width to take and renders as a 1px line. Neither is a fix a
 * composition may make.
 *
 * What is left is the shape the front door's own *Keep going* band already
 * proves: a grid gives each card a definite track to fill, so the two of them
 * share the column and read as two destinations rather than as two captions
 * that have come adrift. The one thing genuinely lost is the navigation
 * landmark the pager announces itself as; the cards still read as *Before this,
 * How it works*, which is the fact a reader needs and the landmark was only
 * going to label.
 */
export const siteReadingBand = (
  ids: IdFactory,
  context: ChromeContext
): readonly LoomNode[] => {
  const { before, after, onward } = readingNeighbours(context.current)

  /**
   * **Nothing on the front door**, which is the one page with no page before
   * it. The guarantee this band exists for is that a reader in the middle of an
   * argument is told where they came from and where they go next, and the front
   * door is not in the middle of one — it is the way in. It also already
   * carries the two strongest onward offers on the site, one screen apart: the
   * *Keep going* band's four destination cards, and a closing band whose
   * primary action is this very page. A third, headed *What to read next* and
   * holding one card spanning the whole column, is the same invitation made a
   * third time and made worst.
   *
   * Nothing becomes unreachable by it. `/how-it-works` is offered by
   * `/the-rules`' own *Before this* card, and the front door by
   * `/how-it-works`' — `chrome.test.ts` holds every page of the site to being
   * offered by some page's band, and that is this band's whole contract.
   *
   * It is `before` rather than a path compared against `HOME`, so the rule is
   * read off the reading order like everything else here: whatever is first is
   * the page with nothing to come back from.
   */
  if (before === undefined) return []

  const cards: readonly LoomNode[] = [
    wayOn(ids, BEFORE_LABEL, before.label, internalHref(context.origin, before.path, context.theme)),
    ...(after === undefined
      ? []
      : [
          wayOn(
            ids,
            NEXT_LABEL,
            after.label,
            internalHref(context.origin, after.path, context.theme)
          ),
        ]),
    /**
     * The palette is not carried through this one, and `surfaceHref` is why: a
     * surface that does not read `?theme=bold` would be handed a parameter that
     * means nothing and looks like it means something. The same rule the
     * footer's map and the front door's band already follow.
     */
    ...(onward === undefined
      ? []
      : [wayOn(ids, NEXT_LABEL, onward.label, surfaceHref(context.origin, onward), onward.blurb)]),
  ]

  return [
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: READ_NEXT_EYEBROW },
      children: [
        buildElement(ids, {
          type: "loom.grid",
          props: { columns: "two", gap: "snug" },
          children: [...cards],
        }),
      ],
    }),
  ]
}
