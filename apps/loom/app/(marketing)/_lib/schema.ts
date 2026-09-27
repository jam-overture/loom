import type { JsonObject } from "@jam-overture/loom"

import { siteQuestions } from "./questions"
import { WORDMARK } from "./share"
import { HOME, internalHref, REPOSITORY_URL, SITE_ROUTES, type SiteRoute } from "./site"

/**
 * What this site tells a machine that is not a browser.
 *
 * Asked for on 27 September: the site should be findable by a search engine and
 * quotable by an AI assistant. The two want mostly the same thing and this file
 * is the half of it that is not prose — a `schema.org` graph, emitted as
 * JSON-LD, describing what the page is rather than hoping a reader of the HTML
 * works it out.
 *
 * ## Why it is worth having at all
 *
 * A crawler reading `/` sees a headline, some bands and a list of questions,
 * and has to infer that this is a product, that the product is software, and
 * that those questions are questions. An assistant asked *what is Loom* does
 * the same inference against whatever fragment of the page it kept. Structured
 * data removes the inference: **the site states it, in the one vocabulary every
 * consumer already parses.** A `FAQPage` in particular is the difference
 * between an assistant paraphrasing an answer and quoting it.
 *
 * ## Every claim here is derived, and the ones that cannot be are absent
 *
 * This is the rule the rest of this lane already follows — `FACTS` counts the
 * repository rather than typing a number, the sitemap holds no path of its own
 * — and it matters more here than anywhere else on the site, because **this is
 * the one text with a non-human reader.** Nobody proofreads it. A wrong claim
 * in it is repeated by a machine to somebody who never sees the page.
 *
 * So the name is the wordmark, the descriptions are the routes' own, the
 * questions are `questions.ts`, and the following are **deliberately omitted**:
 *
 * - **`offers` and any price.** Pricing is the maintainer's and unsettled. A
 *   `price: 0` would be a claim nobody has made, published in the one format a
 *   machine reads as fact.
 * - **`aggregateRating`, `review`, `interactionStatistic`.** Nobody has rated
 *   this. Inventing numbers here is the single most common way structured data
 *   is abused and it is a lie with a schema around it.
 * - **`publisher` and `author` as an `Organization`.** Who publishes this is a
 *   positioning question and positioning is the maintainer's. `sameAs` names
 *   the repository, which is a fact, and says nothing about who owns it.
 * - **`dateModified`.** The same argument the sitemap makes about `lastModified`
 *   and for the same reason: nothing at serve time knows when a page last
 *   changed, so stamping it would say every page changed at the same instant,
 *   differently on every deploy.
 *
 * The test beside this holds the absences as well as the presences, because an
 * omission nobody asserted is an omission the next run puts back.
 */

/** The graph's own ids, so nodes can reference each other rather than repeat. */
const siteId = (origin: string): string => `${internalHref(origin, HOME.path)}#website`
const softwareId = (origin: string): string => `${internalHref(origin, HOME.path)}#software`

/**
 * The site itself. One node, referenced by every page's node.
 *
 * `WebSite` rather than `Organization` is the honest shape: this describes a
 * site that exists at an address, which is checkable, rather than a company,
 * which is the question nobody has answered.
 */
const webSite = (origin: string): JsonObject => ({
  "@type": "WebSite",
  "@id": siteId(origin),
  url: internalHref(origin, HOME.path),
  name: WORDMARK,
  description: HOME.description,
})

/**
 * The product, as the thing it actually is.
 *
 * `applicationCategory: "DeveloperApplication"` is the closest true term in a
 * fixed vocabulary — this is a package a developer installs, not a hosted
 * service and not a consumer app. `sameAs` is the repository, which is where
 * every claim on this site can be checked, and is the strongest single signal
 * available to an assistant deciding whether this is real.
 */
const software = (origin: string): JsonObject => ({
  "@type": "SoftwareApplication",
  "@id": softwareId(origin),
  name: WORDMARK,
  url: internalHref(origin, HOME.path),
  description: HOME.description,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  sameAs: [REPOSITORY_URL],
})

/**
 * The five questions, as the one node on this site an assistant can quote
 * without paraphrasing.
 *
 * Read off `questions.ts`, which the band renders from, so the two cannot
 * disagree. `open` is not carried across: it is how the band draws itself and
 * means nothing to a consumer of this.
 */
const faqPage = (origin: string): JsonObject => ({
  "@type": "FAQPage",
  "@id": `${internalHref(origin, HOME.path)}#questions`,
  mainEntity: siteQuestions().map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
})

/**
 * Where a page sits, which is the one thing a URL does not say.
 *
 * Two levels and never more, because this site is two levels. A breadcrumb
 * claiming a hierarchy the navigation does not have would be describing a
 * different site.
 */
const breadcrumb = (route: SiteRoute, origin: string): JsonObject => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: HOME.label,
      item: internalHref(origin, HOME.path),
    },
    ...(route.path === HOME.path
      ? []
      : [
          {
            "@type": "ListItem",
            position: 2,
            name: route.label,
            item: internalHref(origin, route.path),
          },
        ]),
  ],
})

const webPage = (route: SiteRoute, origin: string): JsonObject => ({
  "@type": "WebPage",
  "@id": `${internalHref(origin, route.path)}#page`,
  url: internalHref(origin, route.path),
  name: route.title,
  description: route.description,
  isPartOf: { "@id": siteId(origin) },
  about: { "@id": softwareId(origin) },
  breadcrumb: breadcrumb(route, origin),
})

/**
 * The whole graph for one page, as one `@graph` rather than several scripts.
 *
 * One script per page keeps the nodes able to reference each other by `@id` —
 * every page's `WebPage` points at one `WebSite` and one `SoftwareApplication`
 * rather than restating them — which is what stops a crawler seeing three
 * products because it read three pages.
 */
export const pageSchema = (route: SiteRoute, origin: string): JsonObject => ({
  "@context": "https://schema.org",
  "@graph": [
    webSite(origin),
    software(origin),
    webPage(route, origin),
    ...(route.path === HOME.path ? [faqPage(origin)] : []),
  ],
})

/** Every route's graph, for the test that sweeps them. */
export const everyPageSchema = (origin: string): readonly JsonObject[] =>
  SITE_ROUTES.map((route) => pageSchema(route, origin))

/**
 * The claims this site will not make about itself, held by name.
 *
 * A denylist rather than a comment, because the reasoning above is the kind a
 * later run reads past. Each of these is a field somebody could add in one line
 * and nobody would notice: they do not render, they do not break a page, and
 * they make the schema look more complete. `schema.test.ts` walks the graph for
 * them.
 */
export const UNMADE_CLAIMS: readonly string[] = [
  "offers",
  "price",
  "priceSpecification",
  "aggregateRating",
  "review",
  "ratingValue",
  "interactionStatistic",
  "publisher",
  "author",
  "dateModified",
  "datePublished",
]
