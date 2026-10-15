"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"
import { faultFor } from "@/app/(portal)/_lib/registering"

import { registerApplication, type RegistrationReport } from "../actions"

/**
 * The form that registers an application.
 *
 * A client component because it reports faults next to the field they belong to
 * without losing what was typed, which is the whole of what a person minds about
 * a form that refuses them.
 */

export const RegistrationForm = ({
  projects,
}: {
  projects: readonly { readonly projectId: string; readonly name: string }[]
}) => {
  const [report, action] = useActionState<RegistrationReport | null, FormData>(
    registerApplication,
    null
  )
  const faults = report?.faults ?? []

  return (
    <form action={action} className="flex max-w-lg flex-col gap-5">
      <Field
        label="What is it called?"
        name="name"
        hint="What you will look for in the list. You can change it."
        fault={faultFor(faults, "name")}
      />

      <Field
        label="Where does it live?"
        name="host"
        placeholder="shop.example.com"
        hint="Optional. Paste the address if it is easier — we will take the host out of it."
        fault={faultFor(faults, "host")}
      />

      {/*
       * Always offered, and blank means the application's name.
       *
       * The maintainer asked for this on 14 October after watching a
       * registration produce a project and an application with identical names.
       * It sits under the host rather than above it because the application is
       * what somebody came here to register; the project is the shelf it goes
       * on, and a shelf nobody has an opinion about should cost one glance and
       * no keystrokes.
       *
       * It is rendered even when an existing project can be chosen below, and
       * `readRegistration` ignores it in that case — the alternative is
       * revealing a field when a select changes, which needs client state for a
       * field whose default is already right.
       */}
      <Field
        label="What should the project be called?"
        name="projectName"
        hint="Leave it blank to use the application's name. Projects group applications; nothing else hangs off one yet."
        fault={faultFor(faults, "projectName")}
      />

      {projects.length > 0 ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm">Which project?</span>
          <select
            name="project"
            defaultValue="new"
            className="border-edge bg-surface-base rounded-md border px-2.5 py-1.5 text-sm"
          >
            <option value="new">A new one, named after this application</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.name}
              </option>
            ))}
          </select>
          {faultFor(faults, "project") === undefined ? (
            <span className="text-ink-muted text-xs">
              Choosing one ignores the name above.
            </span>
          ) : (
            <span className="text-refuse-ink text-xs">{faultFor(faults, "project")}</span>
          )}
        </label>
      ) : null}

      {report?.detail === undefined ? null : (
        <p className="text-refuse-ink text-sm">{report.detail}</p>
      )}

      <Submit label="Register it" pendingLabel="Registering…" />
    </form>
  )
}
