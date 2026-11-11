import { and, desc, eq, type SQL } from "drizzle-orm"

import { DEFAULT_APPLICATION_ID, type ApplicationId, type StoreScope } from "../application/application.js"
import {
  audienceOverlayOf,
  audienceRulesOutcomeOf,
  clampAudienceRuleHistoryLimit,
  parseAudienceRuleRevision,
  parseStoredAudienceForm,
  type AudienceFormListing,
  type AudienceOverlayError,
  type AudienceOverlayStore,
  type AudienceRuleRevision,
  type StoredAudienceForm,
} from "../audience/overlay-store.js"
import type { AudienceForm } from "../audience/compose.js"
import type { TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"

import type { LoomDatabase } from "./database.js"
import { isUniqueViolation, unavailable } from "./driver.js"
import { loomAudienceForms, loomAudienceRules } from "./schema.js"

/**
 * The audience dimension, backed by Postgres (0022). It is the table that
 * `AudienceOverlaySource` was declared as a seam in place of, and it is the
 * store dimension a page served per audience has been waiting on (0263, 0359).
 *
 * **There is no transaction here, and that is the point of the composite primary
 * key.** `recordRules` reads the head, computes the next revision and inserts
 * it; two editors racing at the same head both compute `N + 1` and the database
 * refuses the second. `loom_revisions` and `loom_policy_revisions` get their
 * ordering guarantee the same way, and a `SELECT … FOR UPDATE` could not serve
 * here anyway: the first revision of a page's rules has no row to lock.
 *
 * A refused insert is reported as `out-of-date` against the head as it is *now*,
 * which is the truth the caller needs rather than the one it raced against.
 */

/**
 * Rows come back as `unknown` and are parsed, never cast — storage is a boundary
 * like any other, and it is the one where the data outlives the code that wrote
 * it. A rule is edited rarely and read on every request for as long as the page
 * is published, so of everything in this schema it is among the likeliest to be
 * read back by code that did not write it.
 */
const toRevision = (
  row: typeof loomAudienceRules.$inferSelect,
  treeId: TreeId
): Result<AudienceRuleRevision, AudienceOverlayError> =>
  parseAudienceRuleRevision(
    {
      treeId: row.treeId,
      revision: row.revision,
      rules: row.rules,
      actor: row.actor,
      recordedAt: row.recordedAt,
    },
    treeId
  )

const toForm = (
  row: typeof loomAudienceForms.$inferSelect,
  treeId: TreeId
): Result<StoredAudienceForm, AudienceOverlayError> =>
  parseStoredAudienceForm(
    {
      treeId: row.treeId,
      audienceId: row.audienceId,
      delta: row.delta,
      actor: row.actor,
      authoredAt: row.authoredAt,
    },
    treeId
  )

/**
 * Every query is filtered by the application this handle speaks for (0260), and
 * every write sets it.
 *
 * Without it a page's rules would be read across applications, and two
 * deployments that happened to name their trees alike would serve each other's
 * forms — which is the one thing a dimension that decides *who sees what* cannot
 * get wrong.
 */
export const postgresAudienceOverlayStore = (
  db: LoomDatabase,
  scope: StoreScope = {}
): AudienceOverlayStore => {
  const application = scope.application ?? DEFAULT_APPLICATION_ID

  const head = async (treeId: TreeId): Promise<Result<AudienceRuleRevision | undefined, AudienceOverlayError>> => {
    try {
      const rows = await db
        .select()
        .from(loomAudienceRules)
        .where(mineRules(application, eq(loomAudienceRules.treeId, treeId)))
        .orderBy(desc(loomAudienceRules.revision))
        .limit(1)

      const row = rows[0]

      return row === undefined ? ok(undefined) : toRevision(row, treeId)
    } catch (cause) {
      return err(unavailable(cause, `could not read ${treeId}'s audience rules`))
    }
  }

  const storedForms = async (
    treeId: TreeId
  ): Promise<Result<readonly StoredAudienceForm[], AudienceOverlayError>> => {
    try {
      const rows = await db
        .select()
        .from(loomAudienceForms)
        .where(mineForms(application, eq(loomAudienceForms.treeId, treeId)))
        .orderBy(loomAudienceForms.audienceId)

      const forms: StoredAudienceForm[] = []

      for (const row of rows) {
        const form = toForm(row, treeId)
        if (!form.ok) return form
        forms.push(form.value)
      }

      return ok(forms)
    } catch (cause) {
      return err(unavailable(cause, `could not read ${treeId}'s audience forms`))
    }
  }

  return {
    overlay: async (treeId) => {
      const rules = await head(treeId)
      if (!rules.ok) return rules

      const forms = await storedForms(treeId)
      if (!forms.ok) return forms

      return ok(
        audienceOverlayOf(
          rules.value,
          forms.value.map(({ audienceId, delta }): AudienceForm => ({ audienceId, delta }))
        )
      )
    },

    rules: async (treeId) => head(treeId),

    history: async (treeId, request) => {
      try {
        const rows = await db
          .select()
          .from(loomAudienceRules)
          .where(mineRules(application, eq(loomAudienceRules.treeId, treeId)))
          .orderBy(desc(loomAudienceRules.revision))
          .limit(clampAudienceRuleHistoryLimit(request?.limit))

        const revisions: AudienceRuleRevision[] = []

        for (const row of rows) {
          const revision = toRevision(row, treeId)
          if (!revision.ok) return revision
          revisions.push(revision.value)
        }

        return ok(revisions)
      } catch (cause) {
        return err(unavailable(cause, `could not read ${treeId}'s audience rule history`))
      }
    },

    forms: async (treeId) => {
      const forms = await storedForms(treeId)

      return forms.ok
        ? ok(
            forms.value.map(
              ({ audienceId, delta, actor, authoredAt }): AudienceFormListing => ({
                audienceId,
                baseRevision: delta.baseRevision,
                actor,
                authoredAt,
              })
            )
          )
        : forms
    },

    recordRules: async (treeId, request) => {
      /**
       * Outside the `try`, because `head` is total: the only statement here that
       * can collide is the insert, and a narrow `try` is what lets the `catch`
       * say *a unique violation on this insert means somebody else recorded*
       * rather than guessing which of two statements threw.
       */
      const current = await head(treeId)
      if (!current.ok) return current

      const outcome = audienceRulesOutcomeOf(treeId, request, current.value)
      if (!outcome.ok || outcome.value.outcome === "unchanged") return outcome

      const revision = outcome.value.revision

      try {
        await db.insert(loomAudienceRules).values({
          applicationId: application,
          treeId: revision.treeId,
          revision: revision.revision,
          rules: revision.rules,
          actor: revision.actor,
          recordedAt: revision.recordedAt,
        })
      } catch (cause) {
        if (!isUniqueViolation(cause)) {
          return err(unavailable(cause, `could not record ${treeId}'s audience rules`))
        }

        /**
         * Somebody else took this revision between the read and the insert. The
         * head is re-read rather than guessed at, so the number reported is the
         * one the caller now has to edit from.
         */
        const raced = await head(treeId)

        return err<AudienceOverlayError>({
          code: "out-of-date",
          treeId,
          expected: request.expectedRevision ?? current.value?.revision ?? 0,
          current: raced.ok ? (raced.value?.revision ?? 0) : revision.revision,
        })
      }

      return outcome
    },

    setForm: async (treeId, request) => {
      if (request.delta.treeId !== treeId) {
        return err<AudienceOverlayError>({
          code: "tree-mismatch",
          treeId,
          delta: request.delta.treeId,
        })
      }

      const stored: StoredAudienceForm = { treeId, ...request }

      try {
        await db
          .insert(loomAudienceForms)
          .values({
            applicationId: application,
            treeId,
            audienceId: request.audienceId,
            delta: request.delta,
            baseRevision: request.delta.baseRevision,
            actor: request.actor,
            authoredAt: request.authoredAt,
          })
          /**
           * The rebase, as one statement. A form replaced by reading it, deciding
           * it has moved and writing it back is a form two editors can lose half
           * of; the key is already the identity, so the database can be asked to
           * do it in one.
           */
          .onConflictDoUpdate({
            target: [
              loomAudienceForms.applicationId,
              loomAudienceForms.treeId,
              loomAudienceForms.audienceId,
            ],
            set: {
              delta: request.delta,
              baseRevision: request.delta.baseRevision,
              actor: request.actor,
              authoredAt: request.authoredAt,
            },
          })
      } catch (cause) {
        return err(unavailable(cause, `could not store ${request.audienceId}'s form of ${treeId}`))
      }

      return ok(stored)
    },
  }
}

/**
 * Every read starts at one of these, so a query cannot forget the application by
 * omission — the device `postgresTreeStore` and `postgresPolicyLog` both use,
 * written per table because the two tables are two sets of columns.
 */
const mineRules = (application: ApplicationId, ...rest: (SQL | undefined)[]) =>
  and(eq(loomAudienceRules.applicationId, application), ...rest)

const mineForms = (application: ApplicationId, ...rest: (SQL | undefined)[]) =>
  and(eq(loomAudienceForms.applicationId, application), ...rest)
