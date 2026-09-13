/**
 * The four kinds of reader signal, with nothing else in the module.
 *
 * The schema in `signal.ts` is built from this list. It lives apart so the
 * broadcaster, which runs in a visitor's browser, can know the kinds without
 * pulling in the schema library (0136).
 */

export const READER_SIGNAL_KINDS = ["viewed", "dwelled", "activated", "disclosed"] as const
