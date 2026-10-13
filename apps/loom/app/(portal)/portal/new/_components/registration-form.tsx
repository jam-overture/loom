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
              Projects group applications. Nothing else hangs off one yet.
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
