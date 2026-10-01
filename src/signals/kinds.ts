/**
 * The five kinds of reader signal, with nothing else in the module.
 *
 * The schema in `signal.ts` is built from this list. It lives apart so the
 * broadcaster, which runs in a visitor's browser, can know the kinds without
 * pulling in the schema library (0136).
 */

export const READER_SIGNAL_KINDS = [
  "viewed",
  "dwelled",
  "activated",
  "disclosed",
  "completed",
] as const

/**
 * The kinds whose node is not the thing a reader aimed at.
 *
 * A reader presses a button and opens a disclosure; both are addressed nodes of
 * their own, so the node such a signal is filed against is the control rather
 * than the region the control is in. A submitted form is the same shape — the
 * node is the form, and the band the form was the end of is the thing a
 * deployment wants to read. `viewed` and `dwelled` have no such gap — they are
 * observed on the addressed element itself — which is why these three carry an
 * ancestry and the other two do not (0167).
 *
 * Here rather than in `signal.ts` so the broadcaster can know which signals it
 * must walk for without loading the schema library (0136).
 */
export const DELEGATED_READER_SIGNAL_KINDS = ["activated", "disclosed", "completed"] as const
