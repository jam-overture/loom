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

export const RegistrationForm = () => {
  const [report, action] = useActionState<RegistrationReport | null, FormData>(
    registerApplication,
    null
  )
  const faults = report?.faults ?? []

  return (
    <form action={action} className="flex max-w-lg flex-col gap-5">
      {/*
       * The repository first, which is 0292's order and the reverse of what
       * this form used to do.
       *
       * It is above the name because it supplies one: `jam-overture/loom`
       * becomes `loom`, so somebody who has a repository registers in one
       * field. It is optional because a project with none is connected for
       * observation, which is the first state every customer reaches and the
       * only one available to somebody whose tree lives in a working copy.
       */}
      <Field
        label="Which repository?"
        name="repository"
        placeholder="jam-overture/loom"
        hint="Optional. Paste the URL if it is easier. Leave it blank to connect for observation only — you can add it later."
        fault={faultFor(faults, "repository")}
      />

      <Field
        label="What is it called?"
        name="name"
        hint="Leave it blank to take the name from the repository. You can change it."
        fault={faultFor(faults, "name")}
      />

      <Field
        label="Where does it live?"
        name="host"
        placeholder="shop.example.com"
        hint="Optional. Paste the address if it is easier — we will take the host out of it."
        fault={faultFor(faults, "host")}
      />

      {report?.detail === undefined ? null : (
        <p className="text-refuse-ink text-sm">{report.detail}</p>
      )}

      <Submit label="Register it" pendingLabel="Registering…" />
    </form>
  )
}
