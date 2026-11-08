/**
 * What a screen shows while its data is on the way.
 *
 * Every portal screen reads the database before it can render, and until
 * 8 November there was no `loading.tsx` anywhere in the portal: a click on a
 * tab or a link changed nothing on screen until the whole next screen had
 * arrived, so a slow read looked like a dead link. A route's `loading.tsx`
 * renders this the moment a navigation starts, inside the layouts that are
 * already on screen, so the top bar and the project tabs stay put and stay
 * clickable while the area the data fills shows that it is coming.
 *
 * The placeholder is shaped like what most screens are, a heading over a
 * table, so the page does not jump when the real one replaces it. The
 * indicator sits over the table rather than over the page, because the
 * table is the part that is waiting.
 */

const ROWS = 6

export const ScreenLoading = ({ label = "Loading" }: { readonly label?: string }) => (
  <div className="flex w-full max-w-[90rem] flex-col gap-6 p-8" aria-busy="true">
    <div className="flex max-w-[68ch] flex-col gap-2" aria-hidden="true">
      <div className="bg-surface-hover h-7 w-56 rounded" />
      <div className="bg-surface-hover h-4 w-96 max-w-full rounded" />
    </div>
    <div className="border-edge-subtle relative overflow-hidden rounded-lg border">
      <ul className="m-0 flex list-none flex-col p-0" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, row) => (
          <li
            key={row}
            className="border-edge-subtle flex gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <div className="bg-surface-hover h-4 flex-[2] rounded" />
            <div className="bg-surface-hover h-4 flex-1 rounded" />
            <div className="bg-surface-hover h-4 w-16 rounded" />
          </li>
        ))}
      </ul>
      <div className="bg-surface-base/60 absolute inset-0 flex items-center justify-center">
        <div role="status" className="text-ink-muted flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={
              "border-edge border-t-ink h-4 w-4 animate-spin rounded-full border-2 " +
              "motion-reduce:animate-none"
            }
          />
          {label}…
        </div>
      </div>
    </div>
  </div>
)
