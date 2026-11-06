"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Reads the screen again every `everyMs` while it is in front of somebody.
 *
 * The list, its figures and the drawer are all drawn on the server from the
 * address, so reading again is the whole of being live: nothing here holds a
 * copy of what arrived. A tab nobody is looking at asks for nothing, and picks
 * up on the next tick once it is looked at again.
 */
export const LiveRefresh = ({ everyMs }: { everyMs: number }) => {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, everyMs)

    return () => clearInterval(timer)
  }, [router, everyMs])

  return null
}
