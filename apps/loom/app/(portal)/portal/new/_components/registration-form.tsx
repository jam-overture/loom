"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { faultFor } from "@/app/(portal)/_lib/registering"

import { registerApplication, type RegistrationReport } from "../actions"

/**
 * The form that registers an application.
 *
 * A client component because it reports faults next to the field they belong to
 * without losing what was typed, which is the whole of what a person minds about
 * a form that refuses them.
 */

const Field = ({
  label,
  name,
  hint,
  fault,
  ...input
}: {
  label: string
  name: string
  hint?: string | undefined
  fault?: string | undefined
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm">{label}</span>
    <input
      name={name}
      className={`border-edge bg-surface-base rounded-md border px-2.5 py-1.5 text-sm ${fault === undefined ? "" : "border-refuse-edge"}`}
      aria-invalid={fault === undefined ? undefined : true}
      aria-describedby={fault === undefined ? undefined : `${name}-fault`}
      {...input}
    />
    {fault === undefined ? (
      hint === undefined ? null : (
        <span className="text-ink-muted text-xs">{hint}</span>
      )
    ) : (
      <span id={`${name}-fault`} className="text-refuse-ink text-xs">
        {fault}
      </span>
    )}
  </label>
)

const Submit = () => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-affirm text-affirm-ink border-affirm-edge self-start rounded-md border px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {pending ? "Registering…" : "Register it"}
    </button>
  )
}

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

      <Submit />
    </form>
  )
}
