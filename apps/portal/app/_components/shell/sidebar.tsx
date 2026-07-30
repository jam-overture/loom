import { SidebarNav } from "./sidebar-nav"

/**
 * A 56px icon rail that widens to reveal labels on hover. `group` is what lets
 * the labels inside `SidebarNav` fade in without any of them tracking state.
 */
export const Sidebar = () => (
  <aside className="group bg-surface-sidebar border-edge-subtle fixed top-14 bottom-0 left-0 z-40 flex w-14 flex-col overflow-hidden border-r transition-[width] duration-300 ease-in-out hover:w-[275px]">
    <SidebarNav />
  </aside>
)
