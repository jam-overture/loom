import Link from "next/link"

import { installCommands, whatYouNeed } from "@/app/(docs)/_lib/installing"

import { CodeBlock } from "./code-block"

/**
 * The install command, from the one list that decides it.
 *
 * It was a fenced block typed into the page, and what a typed command does is
 * drift from the code blocks it is supposed to make runnable — which it had,
 * by two packages, one of them on the arrival route. `_lib/installing.ts`
 * carries the whole account. Rendered through `CodeBlock` so it is the same
 * block with the same copy button a fence would have produced: what changes is
 * where the words come from, not what a reader sees.
 */
export const InstallCommand = () => <CodeBlock>{installCommands().join("\n")}</CodeBlock>

/**
 * What each package is for, and the first page that imports it.
 *
 * The last column is the half that cannot go stale: it is read off the code
 * blocks themselves, in the site's own reading order, so a package that moves
 * to an earlier page says so here without anybody editing a row. A package
 * nothing imports has no page and says so with a dash — `react-dom` is the
 * only one, and `installing.ts` makes it state its reason.
 */
export const WhatYouNeed = () => (
  /*
   * `data-needs`, for the same reason `EntryPoints` carries `data-doors`: this
   * page has two tables on it and a selector saying `table` resolves to both.
   */
  <div data-needs className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Package</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">You need it when</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">First used on</th>
        </tr>
      </thead>
      <tbody>
        {whatYouNeed().map((row) => (
          <tr key={row.packages.join(" ")} className="border-edge border-b last:border-b-0">
            <td className="px-3 py-2 align-top">
              {row.packages.map((name) => (
                <div key={name} className="text-ink font-mono text-xs whitespace-nowrap">
                  {name}
                </div>
              ))}

              {row.add === undefined ? undefined : (
                <div className="text-ink-faint mt-1 font-mono text-xs whitespace-nowrap">
                  <span className="select-none">$ </span>
                  {row.add}
                </div>
              )}
            </td>

            <td className="text-ink-muted px-3 py-2 align-top">{row.when}</td>

            <td className="text-ink-faint px-3 py-2 align-top text-xs">
              {row.firstUsedOn === undefined ? (
                "—"
              ) : (
                <Link className="hover:text-ink underline underline-offset-2" href={row.firstUsedOn.href}>
                  {row.firstUsedOn.title}
                </Link>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
