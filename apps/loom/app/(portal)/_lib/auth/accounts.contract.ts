import { describe, expect, it } from "vitest"

import { projectIdSchema } from "@jam-overture/loom/store"

import { actorSchema, type AccountStore } from "./accounts"
import type { MembershipStore } from "./roles"

/**
 * Both implementations of the accounts and the memberships, held to the same
 * behaviour.
 *
 * The same argument the attempt log's contract makes: an interface is only
 * tested once a second implementation exists, and a disagreement between what
 * runs under `pnpm dev` and what runs in production should be a failing test
 * rather than somebody unable to sign in on a Friday.
 *
 * It matters more here than on the attempt log. These two answer *who is this*
 * and *what may they do*, so an implementation that drifted would be a
 * difference in authority between two deployments of the same code.
 */

const ANA = actorSchema.parse("ana@example.com")
const BRUNO = actorSchema.parse("bruno@example.com")
const PROJECT = projectIdSchema.parse("prj_alpha")
const OTHER = projectIdSchema.parse("prj_beta")

const AT = 1_760_000_000_000

const unwrap = <TValue>(
  result: { ok: true; value: TValue } | { ok: false; error: { detail: string } }
): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeAccountStoreContract = (
  name: string,
  make: () => AccountStore | Promise<AccountStore>
): void => {
  describe(`${name} — AccountStore contract`, () => {
    it("finds the actor whose digest this is", async () => {
      const store = await make()
      await store.put(ANA, "digest-of-ana", AT)

      expect(unwrap(await store.actorWithDigest("digest-of-ana"))).toBe(ANA)
    })

    it("answers nothing for a digest it has never held", async () => {
      const store = await make()
      await store.put(ANA, "digest-of-ana", AT)

      expect(unwrap(await store.actorWithDigest("digest-of-nobody"))).toBeNull()
    })

    it("reads an empty store as nobody rather than as a failure", async () => {
      const store = await make()

      expect(unwrap(await store.actorWithDigest("anything"))).toBeNull()
    })

    it("keeps two accounts apart", async () => {
      const store = await make()
      await store.put(ANA, "digest-of-ana", AT)
      await store.put(BRUNO, "digest-of-bruno", AT)

      expect(unwrap(await store.actorWithDigest("digest-of-bruno"))).toBe(BRUNO)
    })

    /**
     * What rotation is here, and the half that is easy to leave out: minting a
     * second key has to **end the first**. A store that only added would leave
     * a key somebody was given because theirs leaked signing them in for ever,
     * and every test above would still pass.
     */
    it("ends the previous key when an actor is given another", async () => {
      const store = await make()
      await store.put(ANA, "first-digest", AT)
      await store.put(ANA, "second-digest", AT + 1)

      expect(unwrap(await store.actorWithDigest("second-digest"))).toBe(ANA)
      expect(unwrap(await store.actorWithDigest("first-digest"))).toBeNull()
    })
  })
}

export const describeMembershipStoreContract = (
  name: string,
  make: () => MembershipStore | Promise<MembershipStore>
): void => {
  describe(`${name} — MembershipStore contract`, () => {
    it("reads back a role it was given", async () => {
      const store = await make()
      await store.put({ actor: ANA, projectId: PROJECT, role: "approver" })

      expect(unwrap(await store.roleIn(ANA, PROJECT))).toBe("approver")
    })

    /**
     * The answer every authorisation check depends on being right. `null` is
     * *holds no role here*, and a store that answered anything else — a default
     * role, an empty string, a throw — would be a portal that let somebody into
     * a project they were never added to.
     */
    it("answers nothing for an actor with no role in the project", async () => {
      const store = await make()

      expect(unwrap(await store.roleIn(ANA, PROJECT))).toBeNull()
    })

    it("keeps one project's role out of another's", async () => {
      const store = await make()
      await store.put({ actor: ANA, projectId: PROJECT, role: "owner" })

      expect(unwrap(await store.roleIn(ANA, OTHER))).toBeNull()
    })

    it("keeps one actor's role out of another's", async () => {
      const store = await make()
      await store.put({ actor: ANA, projectId: PROJECT, role: "owner" })

      expect(unwrap(await store.roleIn(BRUNO, PROJECT))).toBeNull()
    })

    it("replaces a role rather than holding two", async () => {
      const store = await make()
      await store.put({ actor: ANA, projectId: PROJECT, role: "owner" })
      await store.put({ actor: ANA, projectId: PROJECT, role: "viewer" })

      expect(unwrap(await store.roleIn(ANA, PROJECT))).toBe("viewer")
      expect(unwrap(await store.projectsOf(ANA))).toHaveLength(1)
    })

    /** What the workspace screen lists. */
    it("lists every project an actor holds a role in, and no others", async () => {
      const store = await make()
      await store.put({ actor: ANA, projectId: PROJECT, role: "owner" })
      await store.put({ actor: ANA, projectId: OTHER, role: "viewer" })
      await store.put({ actor: BRUNO, projectId: PROJECT, role: "approver" })

      const held = unwrap(await store.projectsOf(ANA))

      expect(
        Object.fromEntries(held.map((membership) => [membership.projectId, membership.role]))
      ).toEqual({ [PROJECT]: "owner", [OTHER]: "viewer" })
    })

    it("lists nothing for an actor in no projects", async () => {
      const store = await make()

      expect(unwrap(await store.projectsOf(ANA))).toEqual([])
    })

    it("takes a role away", async () => {
      const store = await make()
      await store.put({ actor: ANA, projectId: PROJECT, role: "owner" })
      await store.remove(ANA, PROJECT)

      expect(unwrap(await store.roleIn(ANA, PROJECT))).toBeNull()
    })

    it("removes nothing when there was nothing to remove", async () => {
      const store = await make()

      expect(unwrap(await store.remove(ANA, PROJECT))).toBeUndefined()
    })
  })
}
