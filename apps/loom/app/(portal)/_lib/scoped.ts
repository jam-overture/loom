import { applicationIdSchema, type ApplicationId } from "@jam-overture/loom/store"

/**
 * Reading an application id off a route.
 *
 * The id is in the URL, which means it is whatever somebody typed. It is parsed
 * rather than cast for the ordinary reason, and the parse is here rather than in
 * each screen so that `/portal/app_nonsense` gives the same answer wherever it
 * is reached from.
 *
 * There is exactly one application in a deployment today, so every screen under
 * `/portal/[application]` reads the same rows whichever id it is handed. That is
 * a fact about the data and not a licence: the id is checked now so that the day
 * there are two, a screen cannot quietly show one application's pages under the
 * other's name.
 */
export const applicationFromRoute = (value: string): ApplicationId | undefined => {
  const parsed = applicationIdSchema.safeParse(value)

  return parsed.success ? parsed.data : undefined
}
