"use client"

import { useFormStatus } from "react-dom"

/**
 * The two pieces every form in this portal is made of.
 *
 * Extracted when the second form arrived — the settings screen's rename — and
 * not before, because one copy is not a pattern. What they carry is the only
 * part of a form a person actually minds about: a fault printed under the field
 * it belongs to, with what they typed still in it, and a button that says which
 * of the two things it is doing.
 */

export const Field = ({
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

/**
 * The button, which says what it is about to do and then what it is doing.
 *
 * Both words are the caller's, because *Register it* and *Save* are not the
 * same promise and a shared button that said one of them for both would be
 * wrong on one screen.
 */
export const Submit = ({ label, pendingLabel }: { label: string; pendingLabel: string }) => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-affirm text-affirm-ink border-affirm-edge self-start rounded-md border px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
