import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { MarkLegend } from "@/app/(portal)/_lib/proposed-view"

/**
 * What the outlines on the two pictures mean, and how many parts wear each.
 *
 * ## Why a legend rather than labels on the page
 *
 * The obvious build puts the word on the part — a small tag reading *taken away*
 * hanging off the band it is about, the way the outline already hangs off it. It
 * was tried and it is worse, for a reason particular to what is underneath: this
 * is somebody's real page, laid out by primitives that ask their own container
 * how wide it is (0106). A tag is an element, an element in the flow changes the
 * width its neighbours are given, and a picture of a page whose layout was
 * altered by the annotation on it is not a picture of the page.
 *
 * An outline is the one decoration that costs no space at all, which is why edit
 * mode was built on it and why this is built on the same thing. The cost is that
 * an outline cannot say what it means, so the meaning goes beside the pictures
 * instead of on them — once, for both, because the same colour means the same
 * thing on each and a key repeated twice is a reader wondering whether it
 * changed.
 *
 * ## The counts are the change's, not the picture's
 *
 * Each row says how many parts a change does this to, counted from its own
 * operations. Not from what got outlined: a part carrying only words has no
 * element of its own to outline, so a picture can be honest and still show fewer
 * marks than there are parts. Counting the marks that landed would produce a
 * legend that quietly agrees with whatever the picture managed, which is the one
 * thing a key must not do.
 */
export const MarkLegendView = ({
  legend,
  notOutlined,
}: {
  readonly legend: readonly MarkLegend[]
  /**
   * What the pictures cannot show a ring for, when there is any.
   *
   * It belongs in the key rather than under the pictures, and that is the whole
   * of why it is a prop here: it is a qualification on *this list*, and a reader
   * who has read the key and gone looking has already spent the attention the
   * sentence was meant to save.
   */
  readonly notOutlined: string | null
}) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-sm font-medium">What to look for</h2>

    <ul className="flex flex-col gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:gap-x-6">
      {legend.map((entry) => (
        <li key={entry.kind} className="flex items-start gap-2">
          {/*
            * The swatch is the rule itself rather than a coloured square: it
            * carries `data-loom-mark` inside a `loom-marked` box, so it is drawn
            * by exactly the declaration that draws the outline on the page. A
            * hand-picked border here could go on saying green after the rule it
            * is a key to had been changed, which is a legend that lies about a
            * picture on the same screen.
            */}
          <span className="loom-marked mt-0.5 shrink-0" aria-hidden="true">
            <span data-loom-mark={entry.kind} className="block h-2.5 w-2.5 rounded-[2px]" />
          </span>
          <span className="flex flex-col gap-0.5">
            <strong className="font-medium">
              {entry.label} · {entry.parts === 1 ? "one part" : `${entry.parts} parts`}
            </strong>
            <span className="text-ink-muted">{entry.meaning}</span>
          </span>
        </li>
      ))}
    </ul>

    {notOutlined !== null && <p className="text-ink-muted text-xs">{notOutlined}</p>}

    {/*
      * Which of the four operations each colour stands for. A reviewer matching
      * this screen against the change record needs the word the record uses, and
      * the word the record uses is the one this screen has spent four sentences
      * not saying.
      */}
    <TechnicalDetail summary="The operation behind each colour">
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        {legend.map((entry) => (
          <div key={entry.kind} className="flex gap-1">
            <dt className="text-ink-muted">{entry.kind}</dt>
            <dd className="font-mono">
              {entry.technical} ×{entry.parts}
            </dd>
          </div>
        ))}
      </dl>
    </TechnicalDetail>
  </section>
)
