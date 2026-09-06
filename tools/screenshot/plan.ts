import { z } from "zod"

/**
 * What to photograph, as a value rather than as a script.
 *
 * The nine private harnesses this replaces differed in almost nothing: each was
 * a loop over some URLs at some widths, and the reason each was written again is
 * that the loop was tangled up with the browser handling that every one of them
 * also had to rediscover. Separating them makes the interesting half a list a
 * run can write in four lines and the boring half something nobody reads twice.
 *
 * Zod rather than a hand-written type, because a shot list is input: it comes
 * from a JSON file a run wrote minutes ago, and the failure worth preventing is
 * a misspelled key photographing the wrong thing silently.
 */

/**
 * The two widths every lane has been taking pictures at.
 *
 * Named rather than numeric because that is how the reports already read —
 * `…-bold-phone.png`, `…-bold-wide.png` — and a name is what makes two lanes'
 * screenshots comparable. An explicit size stays available for the shot that
 * needs a third.
 */
export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  wide: { width: 1440, height: 900 },
} as const satisfies Record<string, { readonly width: number; readonly height: number }>

export type ViewportName = keyof typeof VIEWPORTS

const viewportSchema = z.union([
  z.enum(["phone", "wide"]),
  z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
])

export const shotSchema = z.object({
  /** Appended to `baseUrl`, or a whole URL when there is no base. */
  path: z.string().min(1),
  /** The file to write, relative to `outDir`. `.png` is added if it is missing. */
  out: z.string().min(1),
  viewport: viewportSchema.default("wide"),
  /**
   * A selector to wait for before the shutter.
   *
   * Strongly preferred over waiting on the network. A form driven by
   * `useActionState` submits by fetch rather than by navigation, so
   * `networkidle` resolves *before* the cookie it sets exists — which is how a
   * run photographed a sign-in page believing it was the screen behind it. Wait
   * on something only the destination has.
   */
  waitFor: z.string().min(1).optional(),
  fullPage: z.boolean().default(false),
})

/**
 * `z.string().url()` is not enough on its own: it accepts `localhost:3000`,
 * because that parses as a URL whose scheme is `localhost`. A base a browser
 * cannot fetch is the mistake worth catching here, so the scheme is checked
 * rather than assumed.
 */
const baseUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:$/.test(new URL(value).protocol), {
    message: "must be an http:// or https:// address",
  })

export const shotListSchema = z.object({
  baseUrl: baseUrlSchema.optional(),
  outDir: z.string().min(1).default("."),
  /**
   * Milliseconds to settle after the wait condition, before the shutter.
   *
   * Zero by default, because a fixed sleep is the thing a selector wait exists
   * to replace. It is here for the one case a selector cannot express — a
   * transition that has started and is not a new element.
   */
  settleMs: z.number().int().min(0).default(0),
  shots: z.array(shotSchema).min(1),
})

export type ShotList = z.infer<typeof shotListSchema>

/** One shot with every default resolved, ready to hand to a browser. */
export type PlannedShot = {
  readonly url: string
  readonly file: string
  readonly viewport: { readonly width: number; readonly height: number }
  readonly waitFor?: string
  readonly fullPage: boolean
}

const withExtension = (out: string): string => (out.endsWith(".png") ? out : `${out}.png`)

const join = (left: string, right: string): string =>
  `${left.replace(/\/+$/, "")}/${right.replace(/^\/+/, "")}`

/**
 * Resolves a shot's address against the list's base.
 *
 * A `path` that is already absolute wins, so a list can mix a page of the app
 * under test with one served from somewhere else without needing two lists.
 */
const urlFor = (list: ShotList, path: string): string => {
  if (/^https?:\/\//.test(path)) return path
  if (list.baseUrl === undefined) return path

  return join(list.baseUrl, path)
}

export const planShots = (list: ShotList): readonly PlannedShot[] =>
  list.shots.map((shot) => ({
    url: urlFor(list, shot.path),
    file: join(list.outDir, withExtension(shot.out)),
    viewport: typeof shot.viewport === "string" ? VIEWPORTS[shot.viewport] : shot.viewport,
    ...(shot.waitFor === undefined ? {} : { waitFor: shot.waitFor }),
    fullPage: shot.fullPage,
  }))
