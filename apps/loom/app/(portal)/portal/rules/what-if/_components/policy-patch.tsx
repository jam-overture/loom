import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { movedLevers, patchLines, type Lever } from "@/app/(portal)/_lib/levers"

/**
 * The one instruction on this screen: what to put in your own project to make
 * any of this real.
 *
 * ## Why it is code and not a button
 *
 * `/portal/rules` says it in those words already — *"what an AI may do to your
 * site is a decision that belongs in your repository, where it is reviewed and
 * versioned like anything else"* — and a simulation is not a reason to move it.
 * 0200 would allow a button here and this screen does not need one: what the
 * reader has in front of them is an argument, and the argument's natural
 * destination is a pull request somebody reviews, not a click nobody sees.
 *
 * It is also the conservative reading of 0031 and of 0200 clause 4. Nothing
 * this screen computes may write a policy. A block of code a person copies is
 * the furthest a measurement can reach, and it is far enough: the person who
 * pastes it has read the evidence that argued for it, which is the whole of
 * what the lever was for.
 *
 * ## Only what moved
 *
 * Printing the whole policy would put a second copy of the host's
 * configuration on a screen, stale from the moment it rendered, in the one
 * place a reader is most likely to paste without reading. The lines here are
 * the difference and nothing else, so pasting them over an existing policy is
 * the change the screen just argued for and not a silent revert of everything
 * it did not mention.
 */
export const PolicyPatch = ({ levers }: { readonly levers: readonly Lever[] }) => {
  const moved = movedLevers(levers)

  if (moved.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-md tracking-tight">If you want this, here is what to change</h2>

      <p className="text-ink-secondary text-sm">
        Nothing above has changed anything. These settings live in your own project, next to the
        rest of your code, so this is the edit to make there &mdash; reviewed and kept like any
        other change you make.
      </p>

      <pre className="border-edge-subtle bg-surface-raised text-ink-secondary overflow-x-auto rounded-md border p-4 font-mono text-xs">
        {patchLines(levers).join("\n")}
      </pre>

      <TechnicalDetail summary="Where these lines go">
        <p className="text-ink-secondary">
          They are fields on the <span className="font-mono">GatePolicy</span> your write path is
          constructed with. Setting a ceiling for an origin the policy has not named adds it;
          every field this screen does not mention keeps whatever you have.
        </p>
      </TechnicalDetail>
    </section>
  )
}
