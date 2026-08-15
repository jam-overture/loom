import { SidebarNav } from "./sidebar-nav"

/**
 * A 56px icon rail that widens to reveal labels on hover — or on focus, so a
 * keyboard user gets the same rail a pointer user does. `group` is what lets the
 * labels inside `SidebarNav` fade in without any of them tracking state.
 *
 * `loom-rail` is what globals.css hangs the inset focus ring off: the rail
 * clips its own overflow so it can animate its width, and a ring drawn outside
 * a nav item would be cut off at the left edge.
 */
export const Sidebar = () => (
  <aside className="loom-rail group bg-surface-sidebar border-edge-subtle fixed top-14 bottom-0 left-0 z-40 flex w-14 flex-col overflow-hidden border-r transition-[width] duration-300 ease-in-out focus-within:w-[275px] hover:w-[275px]">
    <SidebarNav />
  </aside>
)
