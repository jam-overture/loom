"use client"

import { useSyncExternalStore } from "react"

import { isFramed } from "@/app/(demo)/_lib/framed"

/**
 * `isFramed`, asked of the window this component is actually rendering in.
 *
 * `useSyncExternalStore` rather than `useState` in an effect, and the third
 * argument is the whole reason. The demonstration's HTML is rendered on the
 * server, which has no window and cannot know whether the response is about to
 * be put in a box — so the server snapshot is `false` and the markup that
 * arrives carries the links it has always carried. React uses that same
 * snapshot for the hydration render and then re-reads the client one, which is
 * the documented way to hold an opinion the server could not have without
 * hydrating against markup that disagrees with it.
 *
 * The cost is one extra client render on a framed page, and the visible effect
 * is a link that stops being a link within a frame of hydration. The
 * alternative — rendering nothing until we know — would blank the way out on
 * every unframed visit, for a question only the framed ones need answered.
 *
 * **Nothing to subscribe to**, and that is a property of the subject rather
 * than a shortcut: a document's relationship to the window above it is fixed
 * for the life of the document. There is no event, and a component that
 * re-read it on resize would be inventing a way for it to change.
 */
const unchanging = () => () => {}

const here = (): boolean => (typeof window === "undefined" ? false : isFramed(window))

const onTheServer = (): boolean => false

export const useFramed = (): boolean => useSyncExternalStore(unchanging, here, onTheServer)
