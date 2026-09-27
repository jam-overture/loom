import { ORDER_LEAD, SAME_AFTER_THAT, type PageOrder } from "@/app/(portal)/_lib/page-order"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"

/**
 * What order this list of pages is in, above the list.
 *
 * One component rather than a sentence per screen, for the reason the four
 * sentences exist at all: four screens listing one set of pages had four
 * arrangements and no reader could tell whether any two of them agreed. Four
 * hand-written sentences about that would be the same defect with better
 * manners — one of them would be edited and the others would not.
 *
 * ## Why it is two sentences and not one
 *
 * The first names the top of this list, which is the part of an order a reader
 * needs told. The second says the part that is true of every list here, and it
 * is the one that answers *do these two screens agree* — which is the question a
 * reader of five differently-arranged lists actually has, and the question none
 * of them could answer before.
 *
 * `by-name` gets the first sentence only, because for that list the shared
 * tiebreak **is** the order and *after that, every list here is in the same
 * order* would be a second sentence about nothing.
 *
 * ## Why the disclosure
 *
 * Because the honest answer to *why is this list in this order* is an argument,
 * and the governing rule of this lane is that the argument stays and a person
 * does not meet it before they have asked. The surface says which order; one
 * click down says that a store's own listing order is a cursor for resuming a
 * read rather than an arrangement anybody chose, and that the tail of every order
 * here is the page's own name so that two screens agree about the pages they have
 * nothing to say about.
 */
export const ListOrder = ({ order }: { readonly order: PageOrder }) => (
  <div className="flex flex-col gap-1">
    <p className="text-ink-muted text-xs">
      {ORDER_LEAD[order]}
      {order === "by-name" ? null : ` ${SAME_AFTER_THAT}`}
    </p>
    <TechnicalDetail summary="Why this order">
      <p>
        A store lists trees in cursor order: a position to resume a paged read from, which the
        memory store takes from its key order and a Postgres store from an index. It is stable for
        one store and is not an arrangement anybody chose, so two screens listing the same trees
        used to disagree for no reason a reader could find.
      </p>
      <p>
        Each list ranks on something it has already read — a tree&rsquo;s held proposals, its
        revision count, whether this deployment holds a seed for it (0028), or the standing a fold
        just returned — and then falls back to the name derived from the tree&rsquo;s own leading
        heading, with the tree id last so the order is total. Nothing here is read for the sake of
        the sort.
      </p>
    </TechnicalDetail>
  </div>
)
