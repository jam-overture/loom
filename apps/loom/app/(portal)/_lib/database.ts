/**
 * The app's database handle, re-exported.
 *
 * **It moved to `app/_lib/app/` on 12 October** and this file is a shim, so
 * that nothing in this lane changed its imports for a move that is not about
 * this lane.
 *
 * The reason it moved is
 * [0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * condition 1: the marketing surface renders from the store, which means the
 * store is **the app's** rather than the portal's, and a surface reaching into
 * another surface's route group to find it would be saying the opposite.
 * [0220](../../../../../decisions/0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
 * says an app is a registry, a policy and a store; `app/_lib/app/` is where
 * this deployment keeps the third of those, and now says so in its layout.
 */
export { portalDatabase, storeIsDurable } from "@/app/_lib/app/database"
