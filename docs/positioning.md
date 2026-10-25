# Positioning

**What the marketing site says Loom is, who it says it to, and how it is allowed
to sound.** Written 24 October 2026 from the maintainer's answers, which are
quoted verbatim below and are the only authority in this file. Everything that
is not a quotation is this lane working out what follows from one.

> **Read this before writing a word of copy.** `Loom marketing` asked six
> questions on 24 October and had asked three of them on seven consecutive pull
> requests before that, each time at the bottom of a comment. The answers are
> here so that they are given once rather than asked for again, and so that a
> run which has never seen that conversation starts from them.

**It overrules `docs/rollout.md`'s three marketing bullets**, which say the
opposite on two counts and were written as *"three constraints for whoever
writes one"* rather than as a plan. A dated note there points here.

---

## The one-line answer

> *"Loom is the governance model that lets AI safely adapt, evolve, and manage
> your page automatically."* — the maintainer, 24 October

That is **what Loom is**. It is not what the front door leads with, and the
difference between those two things is the most important sentence in this file.

## What the site leads with, and what it leaves under the hood

The maintainer, same day:

> *"Don't worry about the controls. That is the stuff under the hood. The
> building part and why this build is better than traditional methods is
> preferred."*

So:

| | |
| --- | --- |
| **The pitch** | what you can build, and why building it this way beats how you do it now |
| **Under the hood** | the rules, the record, the undo, the refusals |

The governance is how it works. It is not why a stranger should care, and a
front door that leads with it is answering a question nobody has asked yet.

**This reverses what this lane had been building toward.** `docs/rollout.md`
says *"the differentiator is not adaptation, it is the record"*, and five months
of this site were built on that sentence. It is now wrong as a **marketing**
claim. Nothing about the product changed: the record is still the thing Loom
does that nothing else does, and it is still worth saying on a page somebody
reads **after** they want the product. It is not the opening.

## The chain, which is the message

The maintainer's own, verbatim, and it is the spine of the site:

> React/TypeScript components > Loom framework / Primitives > Loom designed web
> page > Signals broadcasting to your AI model > AI reacting to signals and
> redesigning page > Greater user engagement and conversion

Six links. A page that explains those six in order, in words a junior developer
reads once, is the site. *Greater user engagement and conversion* is the
maintainer's own phrasing and is the payoff the site is allowed to promise.

## Who is reading

> *"You're writing for a web developer, but assume it is the casual web
> developer. Imagine junior level developer."* — 24 October

Not a buyer, not a compliance function, not an agency. **A junior developer who
builds web pages.** Write for somebody who knows React, has shipped a few
things, and has never heard of any of this.

**This also reverses `docs/rollout.md`**, which guessed *"the audience is
probably not hobbyists… regulated teams, agencies answering to clients, anyone
with a compliance function."* That guess is what produced a site arguing about
audit trails. It is wrong and this is right.

## Why anyone would look

> *"This is brand new. So no one knows about it yet, and I don't think there are
> a lot of people thinking about it. So don't worry about the bad day that
> drives people to it, worry about how to get people interested in it."*

**Nobody is searching for this.** There is no problem to meet somebody in the
middle of. The job is to be interesting to a developer who arrived by accident,
which means showing what they could build and how much less work it is than what
they do now.

So the page does not open on a pain. It opens on a thing you can make.

## What it costs

> *"Someone installs it, if they want easy hook up for signals and to their AI
> models, they'll pay for the portal."*

- **The framework is free and installed.** `npm install`, and it works.
- **The portal is the paid part.** What it sells is not having to wire up the
  signals and the model connection yourself.

The front door may say both. Pricing beyond *the framework is free and the
portal is paid* is not settled and is not this lane's to invent.

## Is it ready

> *"Yes, say the framework is ready."*

The site says the framework is ready to use today. The standing question about a
pre-production notice, carried on seven pull requests, is answered: **no such
notice on the marketing site.** `(docs)` wearing a `PRE-PRODUCTION ALPHA` badge
is the documentation lane's call and is no longer this lane's to match.

---

# How it is allowed to sound

`docs/routines.md`' *The voice a visitor reads* still holds in full. This is the
ruling that was added to it on 24 October, with the sentence that caused it:

> *"Stop saying stuff like this "You decide what may change, before anyone
> asks"… it's not that what you are saying is incorrect, it's that no one talks
> like that. It is obvious AI written crap and is not allowed."*

## The shape that was banned

A headline that ends in a comma and then a short clause which adds no fact. The
clause is there for rhythm. Read aloud by a person it sounds like an
advertisement rather than an explanation.

| on the site | what a person would say |
| --- | --- |
| You decide what may change, before anyone asks | You choose what the AI is allowed to change |
| Your own components, never rewritten | Loom never rewrites your components |
| It runs in your app, not in front of it | It runs inside your app rather than in front of it |
| Which parts you reach, and never who you are | It counts which parts you reach and never who you are |

**`may` is part of it.** People say *can*, or *is allowed to*. *May* is the
register of a terms-of-service page.

## The check

`(marketing)/_lib/voice.test.ts` holds the checkable half: **no headline on this
site ends in a comma clause.** It is a rule about headlines rather than about
all copy, and that boundary was measured rather than guessed — a rule over every
sentence flags 34 strings and among them is the maintainer's own
*"Pick the model you already use, or bring your own,"* which is exactly the
register the site is supposed to be in. The sin lives in headlines. On the day
the rule was written it caught **9 of this site's 49 headlines, and none of the
maintainer's own lines.**

`docs/routines.md` already says it and it applies here: **if the test fails the
fix is a rewrite, not a comma.** A headline that satisfies this rule by losing
its punctuation has bought nothing.

---

# What this makes wrong, and what it settles

## Wrong as of today, and not yet fixed

Most of what the site argues is the governance story, which is now the thing
under the hood:

- **`/how-it-works` is entirely it.** Five steps, then *Your rules*, *The
  record*, *When the answer is no*, *Putting it back*, *Who is asking*.
- **The front door's *Every change, in four words*** (Ask, Check, Record, Undo).
  Moved below the chain on 25 October rather than rewritten.
- **The front door's *The hard part is answering for what it changed***, which
  argued the audit case to a reader who had not yet been told what Loom builds.
  Also moved below the chain on 25 October.
- **The front door's *What is Loom?* band** answers that question with the
  governance story. Its heading was *A governance framework for modern
  AI-enabled adaptive web pages* and is now the plain sentence that had been
  sitting under it, because the abstract one was the example this lane had put
  to him. **The band itself is still the governance answer and is still on the
  list**: whether a page that leads with the chain wants it at all is his.
- **`/what-you-run`** is mostly reassurance about what leaves your server, which
  is an answer to a question a junior developer has not asked yet.

None of this is deleted. The front door is being rewritten first, and what
happens to `/how-it-works` and `/what-you-run` after that has not been decided.
**Rewriting is not the same as deleting** and this file does not authorise
either: where a band comes off, it comes off because the maintainer said so.

## Answered the same day

**1. The demonstration stays.** He wrote *"We can leave the demo for now until
we get a video up and running."* So the band where a visitor asks the page to
change itself, and the record panel beside it, **stay on `/how-it-works`** until
there is a video to replace them. This lane had read his earlier
*"don't worry about showing it on the marketing page"* as an instruction to
delete them, and that reading was wrong. Nothing is deleted.

**2. The front door is rewritten first.** *"Front door first."*

## The headline, which is settled

Three were proposed and he took the second:

> **A web page that rearranges itself around the people using it.**

> *"I like the second headline. Simplest but gets to the point."* — 24 October

**It replaces his own headline of 27 September**, *"Make your web page dynamic
with AI and Loom"*, which is in `copy.ts`' `MAINTAINERS_OWN` and has been since
it was written. That list is verbatim quotations of his lines and this is him
replacing one of them, so the list changes with the page rather than keeping a
sentence he has moved on from.

The rest of the draft from that conversation — the opening paragraph, the six
links as six steps, the free-framework-paid-portal line — is **a starting point
and not approved copy.** It is worth reading and worth throwing away.

## Keeping this file honest

It is `Loom marketing`'s, in the way `docs/signals.md` is the signals lane's.
Three rules, taken from how `docs/routines.md` handles the same problem:

- **Quotations are verbatim and are never edited.** They are the whole value of
  the file. Everything else is this lane's reading and may be wrong.
- **A direction that changes is a dated note, not an edit.** Where the
  maintainer says something new, it goes underneath with its date and the old
  text stays, so a run can see what was believed and when.
- **Where this file and a maintainer comment disagree, the comment wins and this
  file is wrong.** Say so in a report rather than following it.
