import type { HowItIsRead } from "@/app/(portal)/_lib/pieces-read"

/**
 * The two figures about one piece, drawn the one way they are ever drawn.
 *
 * ## Why it is a component and not two paragraphs in two files
 *
 * The pair appears twice on this screen: in the section that names the piece to
 * look at first, and on that piece's own card in the list below. The first
 * photograph had them as one run-on paragraph in the section and two lines on
 * the card — the same two figures, in two shapes, forty pixels apart in the
 * reading order — and the second shape is the one that works: a line for the
 * places and a line for the readers is what makes it legible *that there are
 * two of them*, which is the whole property this reading turns on.
 *
 * Two presentations of one reading is how a portal comes to read as two
 * measurements. `_lib/pieces-read.ts` already makes the two figures arrive
 * together so that neither can be drawn alone; this makes them arrive *looking*
 * the same wherever they are.
 *
 * ## Why the readers half is never a gap
 *
 * It is a share or it is the reason there is not one. A reader who meets a
 * places figure and nothing under it cannot tell a piece nobody has measured
 * from a piece whose page has no count of arrivals, and those two send a person
 * to completely different places — so the absence is a sentence, one step
 * quieter than the figure it replaces.
 */
export const HowRead = ({ read }: { readonly read: HowItIsRead }) => (
  <>
    <p className="text-ink-secondary text-xs">{read.places}</p>

    {read.readers === undefined ? (
      <p className="text-ink-muted text-xs">{read.withheld}</p>
    ) : (
      <p className="text-ink-secondary text-xs">{read.readers}</p>
    )}
  </>
)
