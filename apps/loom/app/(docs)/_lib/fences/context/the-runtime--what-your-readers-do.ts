import type { LoomTree, ThemeRegistry } from "@jam-overture/loom"
import type { ReaderSignalJournal, ReaderTallyStore } from "@jam-overture/loom/signals"
import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * What your readers do.
 *
 * The page is written from inside a deployment that already exists: a `tree` has
 * been loaded, and the `registry` and `themes` were built at start-up — several
 * sections before the block that renders with them. Both are the narrator's, and
 * saying so is how you explain a render without re-teaching registration.
 *
 * `journal` and `tallies` are the two the page composes somewhere else. Both are
 * runtime interfaces with published implementations, so they are declared at
 * their real types rather than shaped by hand — a deployment builds them once
 * from its database and the endpoint and the collector are each handed one.
 *
 * This file used to declare a `store: (batch) => Promise<void>` instead, on the
 * grounds that where a batch goes was not the runtime's decision (0136) and a
 * context file inventing a destination would be documenting a seam that did not
 * exist. That was right when it was written and stopped being right on 13
 * September, when the deferral was lifted and the journal was built. The page
 * went on teaching a function the reader had to write for another month.
 * `_lib/absences.ts` is what was added so the next one of these is a red build
 * rather than a quiet month.
 */

export declare const tree: LoomTree
export declare const registry: PrimitiveRegistry
export declare const themes: ThemeRegistry
export declare const journal: ReaderSignalJournal
export declare const tallies: ReaderTallyStore
