# 0274. A patch field says set, cleared or unchanged, and clearing removes the key

**Status:** Accepted
**Date:** 2026-10-13
**Section:** §2 (the store), §3 (portal)

## Context

`ApplicationStore.rename` takes the fields a caller wants changed and leaves the
rest alone. Both implementations read an absent field the same way:

```ts
const next = applicationSchema.safeParse({
  ...found.value,
  ...(to.name === undefined ? {} : { name: to.name }),
  ...(to.host === undefined ? {} : { host: to.host }),
})
```

Absent means *leave it alone*, which is the right reading for a partial update
and leaves **no way to express "remove it"**. An application's host is optional,
so an application could be given one and never have it taken away.

`/portal/[application]/settings` met this the day it shipped. It shows the host
in a box, and a person who empties the box and presses save means *I do not have
a host any more*. That submits an absent host, which renames nothing and would
report success — the one outcome a settings screen must never produce. The
screen refuses that half of the edit and says why, which is honest and is not
what anybody wants. `Loom portal` filed it rather than working around it, on the
grounds that clearing a field is a change to what `rename` *means* and a surface
does not get to make it. That is the right grounds and this is the record.

The portal routine is paused as of 13 October, so the screen is not changed
here; what changes is that there is now a call for it to make.

## Decision

**1. A patch field carries three states, and `null` is the third.** A value
sets it, `null` clears it, and absent still leaves it alone. `Patch<T>` in
`src/patch.ts` is `T | null`; the absence is the property's own optionality, so
`host?: Patch<string>` reads as all three and needs nothing else written down.

**2. `null` and not `""`.** An empty string is a value the schemas go on
refusing, and both stores refuse it as before. One spelling of nothing per
field is the point: a second would have every store deciding for itself which
of the two it honoured, and a caller unable to tell which it had got.

**3. Clearing removes the key rather than setting it to `undefined`.** The
schemas these patches are parsed against are `.strict()` and spell an absent
field `.optional()`, so a key holding `undefined` is not what a record that
never had the field looks like. A cleared host and a host never given have to be
the same thing, because every reader downstream of them already treats them as
one — and `exactOptionalPropertyTypes` means the compiler agrees.

**4. One applier, in one place.** `applyPatch(subject, patch)` is where the
three states are interpreted. Both application stores and both project stores
call it, so the `Map` and the column cannot drift about what a patch means in
the way they once could about what a name was. It does not validate: the caller
parses what comes back against the schema that owns the record, which is the
property that already made the two stores agree.

**5. Only what is optional is clearable.** `PatchOf<T>` offers `null` for a
field the record says may be absent and not for one it requires, so there is
nothing for clearing a name to mean and the type does not offer it. `Project`
has no optional field today, so `ProjectStore.rename` gains no new state — it
is on the same applier so that the first optional field it takes is clearable
on the day it is added, with no second spelling of nothing to invent.

## Consequences

**`ApplicationStore.rename`'s parameter widens.** `host?: string` becomes
`host?: Patch<string>`. This is a widening, so every existing caller — the
portal's two actions, the seeds, the tests — compiles and means exactly what it
meant. Nothing in this repository changes behaviour: no caller passes `null`
yet.

**The settings screen can be finished.** The refusal in
`(portal)/portal/[application]/settings/actions.ts` and the sentence it shows
are now wrong rather than honest, and removing them is a `Loom portal` change
on a paused routine. Filed for it, not done here.

**A migration is not needed.** A cleared host reaches the column as `NULL` by
the route an absent one always took: `applyPatch` removes the key, the parsed
application has no host, and the write already coalesced a missing one. No
stored row changes shape and no built code is migrated.

**The suite asserts it of both stores.** Four cases in
`src/testing/application-contract.ts` — clearing a host, clearing one that was
never there, clearing and renaming in one call, and refusing an empty string —
run against the `Map` and against Postgres. The one that matters most asserts
that a cleared application and one that never had a host have the same keys,
because that is the fact that cannot be read off either implementation alone.

## Alternatives considered

**An empty string as the clearing.** Cheapest, and it makes the schema the
liar: `applicationSchema` refuses `""` for a good reason — a host that is the
empty string is not a host — so accepting it at the patch and dropping it in
the store means the type says one thing and the call does another. It also
cannot generalise: a field whose empty value is meaningful has no spelling left.

**A separate `clearHost` method.** Honest and it does not scale. Every optional
field on every record would earn a method, the two-field edit becomes two calls
with no transaction around them, and a screen that changes a name and removes a
host has to decide what to do when the second one fails.

**A `fields: ["host"]` list of what to clear, beside the patch.** The shape
some JSON APIs use. Rejected because it is two places to say one thing: a patch
carrying `host: "a"` and a clear list naming `host` is expressible and means
nothing, so the store would need a rule for it and callers would need to know
the rule.

**Leave it, and let the screen keep refusing.** What was happening. The cost is
not the screen — it is that the first optional field on the next record arrives
with the same gap, and the person who hits it has to re-derive this argument.
A record with an optional field it cannot clear is a record with a one-way
door in it.

**Make the whole `Application` patchable through one generic update.** More
power than is wanted. `rename` names the two fields a person edits; an update
that accepted `applicationId` or `createdAt` would need to refuse them anyway,
and refusing them in a type is cheaper than refusing them at runtime.
