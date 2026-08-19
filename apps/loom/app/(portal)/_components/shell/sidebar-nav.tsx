"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { isNavItemActive } from "@/app/(portal)/_lib/nav"

import { NAV_GROUPS } from "./nav-items"

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
        <div key={group[0]?.href ?? index}>
          {index > 0 && <div className="border-edge-subtle mx-4 my-2 border-t" />}
          {group.map((item) => {
            const active = isNavItemActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
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
                <span className="ml-3 font-mono whitespace-nowrap opacity-0 transition-opacity delay-100 duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
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
