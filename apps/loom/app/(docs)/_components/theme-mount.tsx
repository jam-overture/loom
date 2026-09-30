import { describeRenderDiagnostic, renderLoomTree } from "@jam-overture/loom/react"
import type { CSSProperties, ReactNode } from "react"

import { docsRegistry } from "@/app/(docs)/_lib/loom/registry"
import {
  buildExcerpt,
  CONTRAST_BAR,
  houseGround,
  mountedGround,
  mountedStyle,
  printRatio,
  ratioOnHouseGround,
  ratioOnThemeGround,
} from "@/app/(docs)/_lib/mounting"

/**
 * The same band, in two frames that differ by one call.
 *
 * Both frames carry `themeStyle(theme)`, so the words inside them are set in the
 * tree's ink in both. The left frame paints the ground its own chrome holds; the
 * right frame asks `themeGround(theme)` for it. Everything else — the tree, the
 * registry, the render — is shared, and the tree is rendered **once** and placed
 * twice rather than rendered twice, so the two sides cannot quietly become
 * different bands.
 *
 * **Stacked rather than side by side**, at every width. A band is designed for
 * the width of a page, and two of them in half-columns is a band laid out for a
 * phone photographed on a desktop — the steps that run across the page stack,
 * and the frame crops. One above the other costs a scroll and shows the reader
 * the band the library actually builds.
 *
 * It renders on the server and ships nothing: there is no state here and nothing
 * to press. The propose-a-change box belongs on an `<Example>`, where the whole
 * point is that a reader can change the tree; this is a measurement, and a
 * measurement a reader can edit is not one.
 *
 * **Why the ratio is printed and not left to the eye.** A reader can see that
 * the left side is unreadable, and a reader on a phone at arm's length in
 * daylight may not. The number under each frame comes from `contrastRatio` —
 * the same function behind the palette audit further up the page — so the
 * section's claim survives being looked at badly.
 */

/**
 * Rendered once, at module scope, and refused if the runtime had anything to
 * say about it.
 *
 * A diagnostic here would mean the excerpt this section is built on did not
 * render as asked, which makes every sentence around it a guess. The build is
 * the right place to find that out — the same judgement `_lib/loom/registry.ts`
 * makes about a registry that will not load.
 */
const rendered = renderLoomTree(buildExcerpt(), { resolver: docsRegistry, validator: docsRegistry })

if (rendered.diagnostics.length > 0) {
  throw new Error(
    `loom: the theming page's excerpt did not render cleanly — ${rendered.diagnostics
      .map((diagnostic) => describeRenderDiagnostic(diagnostic))
      .join("; ")}`
  )
}

/**
 * One frame around the excerpt.
 *
 * `style` is composed by the caller rather than here, because the whole subject
 * of the section is which declarations the frame got — hiding that behind a
 * boolean prop would put the interesting difference in this file instead of on
 * the page.
 */
const Frame = ({
  label,
  style,
  children,
}: {
  readonly label: string
  readonly style: CSSProperties
  readonly children: ReactNode
}) => (
  <div className="border-edge rounded-t-lg border px-3 py-4" style={style} data-frame={label}>
    {children}
  </div>
)

const FrameCaption = ({
  title,
  detail,
  ratio,
}: {
  readonly title: string
  readonly detail: string
  readonly ratio: number
}) => {
  const clears = ratio >= CONTRAST_BAR

  return (
    <div className="border-edge bg-surface-sunken flex flex-col gap-1 rounded-b-lg border-x border-b px-3 py-2">
      <span className="text-ink font-mono text-xs font-semibold">{title}</span>
      <span className="text-ink-muted text-xs">{detail}</span>
      <span
        className={`font-mono text-xs ${clears ? "text-ink-muted" : "text-warning-ink"}`}
        data-ratio={printRatio(ratio)}
      >
        {printRatio(ratio)} — {clears ? "clears" : "fails"} the {CONTRAST_BAR}:1 bar body text has to meet
      </span>
    </div>
  )
}

export const ThemeMount = () => (
  <div className="not-prose my-8 flex flex-col gap-6" data-theme-mount="">
    <figure className="flex flex-col gap-0">
      <Frame label="house" style={{ ...mountedStyle, backgroundColor: houseGround }}>
        {rendered.element}
      </Frame>
      <FrameCaption
        title="themeStyle(theme)"
        detail="The variables are mounted, so the ink is the tree's. The ground is the one this site's own chrome was built with."
        ratio={ratioOnHouseGround}
      />
    </figure>

    <figure className="flex flex-col gap-0">
      <Frame label="ground" style={{ ...mountedStyle, ...mountedGround }}>
        {rendered.element}
      </Frame>
      <FrameCaption
        title="themeStyle(theme) and themeGround(theme)"
        detail="The same frame, told what paper the excerpt would have been sitting on."
        ratio={ratioOnThemeGround}
      />
    </figure>
  </div>
)

/**
 * What `themeGround` actually hands back for the theme in the frames above.
 *
 * Three rows, read off the returned object rather than typed, so a fourth
 * declaration added to `ThemeGround` appears here and a renamed one cannot leave
 * a row behind. The value is printed as it would be written in a style object,
 * which is the form a reader is about to paste.
 *
 * `colorScheme` is optional on the type and present for every registered
 * palette, so an absent row is a real answer rather than a gap — it means the
 * palette's pair could not be read and the host's own `color-scheme` stands.
 */
export const MountedGround = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border" data-mounted-ground="">
    <table className="w-full min-w-[22rem] border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Declaration</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">What it came back as</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(mountedGround).map(([key, value]) => (
          <tr key={key} className="border-edge border-b last:border-b-0">
            <td className="text-ink px-3 py-2 font-mono text-xs whitespace-nowrap">{key}</td>
            <td className="text-ink-muted px-3 py-2">
              <span className="inline-flex items-center gap-2">
                {value.startsWith("#") && (
                  <span
                    className="border-edge inline-block h-4 w-4 shrink-0 rounded border"
                    style={{ backgroundColor: value }}
                  />
                )}
                <span className="font-mono text-xs" data-ground={key}>
                  {value}
                </span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
