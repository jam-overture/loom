import type { PartName as PartNameValue } from "@/app/(portal)/_lib/part-name"

/**
 * A part of a page, named — with its id kept beside the name rather than
 * replaced by it.
 *
 * The same pairing `PageName` makes for a page, one level down, and for the same
 * reason: the words say which part of your page this sentence is about, and the
 * id says which part it is to the log, the delta and anything else that holds
 * one. 22 August settled that identity is not technical detail, so the id does
 * not go behind a disclosure, and 6 September settled the order — the words
 * first, the identifier after them, quieter and in monospace.
 *
 * Unlike `PageName` this has one layout, because a part is only ever met inside
 * a sentence. It has no row of its own anywhere in the portal, and if it ever
 * gets one it gets a layout then rather than a spare one now.
 */
export const PartName = ({ part }: { readonly part: PartNameValue }) => (
  <>
    <span title={part.name}>{part.name}</span>{" "}
    <span className="text-ink-muted font-mono">{part.nodeId}</span>
  </>
)
