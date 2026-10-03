"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { MouseEvent } from "react"

import { isNavItemActive } from "@/app/(portal)/_lib/nav"

import { NAV_GROUPS } from "./nav-items"

/**
 * A rail that has been navigated with the pointer should not stay open.
 *
 * The rail widens on `hover` **and** `focus-within`, and the second one is what
 * kept it open: a link keeps focus after it is clicked, so the rail stayed
 * expanded after the pointer had left it and the only way to close it was to
 * click somewhere else. The maintainer's words were *"super annoying to have to
 * click again to close it."*
 *
 * It is worse than annoying on a touch screen, where there is no pointer to
 * leave: a tapped link holds focus with nothing to take it away, so the rail
 * covers a third of the screen until something else is tapped.
 *
 * **`detail === 0` is the whole of how a keyboard is told from a pointer.** A
 * click event from Enter or Space on a focused link carries a detail of 0; a
 * real press carries the click count. So a pointer press gives the focus back
 * and the rail collapses when the pointer leaves, and a keyboard press keeps it,
 * because taking focus off the element a keyboard user just activated would
 * drop them at the top of the document — and would undo the reason
 * `focus-within` is on the rail at all, which is that a keyboard user tabbing
 * it would otherwise meet six unlabelled icons.
 *
 * Blurring rather than collapsing by state, because the width is CSS and should
 * stay CSS: a component holding an `expanded` boolean would have to own the
 * hover case too, and then a rail the pointer is resting on could be closed by a
 * render.
 */
const releaseAfterPointerPress = (event: MouseEvent<HTMLAnchorElement>): void => {
  if (event.detail === 0) return

  event.currentTarget.blur()
}

/**
 * The only client component in the shell, and it is one because the active item
 * is a function of the current path. Everything it decides is delegated to
 * `isNavItemActive`, so the matching rule is testable without a router.
 */
export const SidebarNav = () => {
  const pathname = usePathname()

  return (
    <nav className="flex-1">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.name}>
          {index > 0 && <div className="border-edge-subtle mx-4 mt-2 border-t" />}
          {/*
            * The group's name, revealed with the labels and on the same trigger.
            *
            * It cannot be shown when the rail is closed — there are fourteen
            * pixels of it — so it fades in exactly as every label does, and it
            * reserves its height either way so the icons do not move when the
            * rail opens. A rail whose contents jumped on hover would be a worse
            * failure than the unnamed groups this replaces.
            *
            * `aria-hidden`, because the heading is a visual grouping of links a
            * screen reader already reads as a list, and the one thing it must
            * not become is a fifteenth thing to tab past.
            */}
          <p
            aria-hidden="true"
            className="text-ink-placeholder px-4 pt-2 pb-1 text-[10px] tracking-wide whitespace-nowrap uppercase opacity-0 transition-opacity delay-100 duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {group.name}
          </p>
          {group.items.map((item) => {
            const active = isNavItemActive(pathname, item.href, item.exact)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={releaseAfterPointerPress}
                aria-current={active ? "page" : undefined}
                className={
                  "flex items-center border-l-2 px-4 py-3 text-sm no-underline transition-all duration-200 " +
                  (active
                    ? "border-nav-edge bg-nav-active text-ink"
                    : "text-nav-idle hover:bg-surface-hover hover:text-ink border-transparent")
                }
              >
                {item.icon}
                {/*
                 * The label follows focus as well as the pointer. Without
                 * `group-focus-within` a keyboard user tabs the rail as six
                 * unlabelled icons — the rail would be navigable and unreadable
                 * at the same time, which is worse than either.
                 */}
                <span className="ml-3 whitespace-nowrap opacity-0 transition-opacity delay-100 duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
