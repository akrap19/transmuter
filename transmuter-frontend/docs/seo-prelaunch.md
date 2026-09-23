# Transmuter site: SEO and AEO preparation

> **STATUS: PREPARATION, NOT FINAL.** Everything here is done on the staging build before launch. The final SEO and AEO audit runs on the live site after launch (section 6). Items marked *provisional* hold until the founders confirm them.

Staging reviewed: `gleaming-pixie-f09a4a.netlify.app`, six pages (home, faq, glossary, integrate, holders, access), source files V31 plus a screen recording. Target domain: `www.transmuter.net` (provisional host, see section 1). Previous domain: `themidasinitiative.com`.

## 1. Decide first (founders)

**Canonical host, provisional `www.transmuter.net`.** Chosen because Docs already lives at `www.transmuter.net/docs`. If the bare `transmuter.net` is preferred, find and replace the host in every head block, `robots.txt`, `sitemap.xml` and `_redirects`.

**Where Docs is served from.** If `/docs` is hosted by a separate service, it has to be proxied under the main domain (rule prepared in `_redirects`, section 5) or it will be treated as a second site.

**Old name in structured data, provisional.** The Organization block names the company `Transmuter` and keeps `The Midas Initiative` as `alternateName`. Search engines and AI models still hold the old name from the previous site, and this line tells them both names are one entity. If the founders want the old name gone from the code entirely, delete the `alternateName` line.

**"Who is behind Transmuter?" on the FAQ.** The answer is currently "The Midas Initiative." It needs a new answer from the founders (section 3).

**Integrate page, two claims.** Explained in section 3. They need a founder answer, not a copy edit.

## 2. Every page

**Replace** the whole `<head>` content above the stylesheet links with that page's block from section 7. The block includes new JSON-LD, so the existing `Organization` script (which names "The Midas Initiative") is deleted on all six pages.

**Rename in the footer** on all six pages: `© 2026 The Midas Initiative · Transmuter` becomes `© 2026 Transmuter`.

**Remove** line 1 of `styles.css` (the Google Fonts `@import`). Fonts now load from `<head>` with preconnect, so the browser fetches them before parsing a 90 KB stylesheet.

**Remove** all HTML comments before publishing. They are public in page source:

- faq: `FOUNDER DETAIL: Add the specific live-token changes when confirmed.`
- glossary: `OPEN DECISION: DAO token omitted until it enters the site properly.`
- integrate: `FOUNDER DETAIL: Commercial terms and getting started omitted until confirmed.`
- holders: `FOUNDER DETAIL: How to check a token is not published until the explorer flow exists.` and `VERIFY: FTX comparison omitted until figures and end-of-life cost are confirmed.`
- access: `FOUNDER DETAIL: Post-submission next step omitted until confirmed.`

**Add** to the site root: `robots.txt`, `sitemap.xml`, `_redirects` (attached), plus these assets from design: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` (180x180), `logo.png` (square, used by structured data), `og-image.png` (1200x630, the card shown when a link is shared on X).

**Check** that production does not carry what Netlify injects on this staging deploy: the hosting comment and `hosting-provider` / `netlify-deploy` meta tags, the `/.netlify/scripts/hud` script after `</html>`, and the "Powered by Netlify" badge. None of it is in the source files [verify with whoever set up hosting].

**Keep staging out of search.** Serve `X-Robots-Tag: noindex` on staging deploys only, or put staging behind Netlify password protection.

## 3. Page fixes

### Home

- **H1 missing a space.** `<span class="hero-title-line hero-title-first">Your token,</span><span ...>backed from the first block.</span>` reads to crawlers as "Your token,backed". Add a space: `Your token, </span>`.
- **"guarantee" on the page.** FAQ answer "What are the limits of the system?" says `vet teams or guarantee price`. Replace with `vet teams or make statements about token price`, the wording already on `/faq/`.
- **Remove the homepage `FAQPage` script.** The same four questions are marked up on `/faq/`, and a repeated FAQ is marked up once, on its main page. The visible homepage FAQ stays.
- Optional: the four homepage answers are worded differently from the same answers on `/faq/`. Using the `/faq/` text on both removes the second version AI models could quote.

### FAQ

- Keep the existing `FAQPage` script. All 28 questions match the page.
- **"Who is behind Transmuter?"** Replace the answer "The Midas Initiative." in both the visible page and the `FAQPage` script with the founders' new answer. Until it exists, remove the question from both places rather than publish the old name.
- **One answer does not match the visible text.** In the `FAQPage` script, replace the answer to "Can a team take the money and disappear?" with the visible text:

  `A team cannot withdraw its project’s treasury at will. If configured, escrow unlocks automatically on the schedule fixed before launch, without requiring a vote for each payment. Holders can vote to pause, resume or advance the next tranche, without rewriting the schedule. Paused escrow stays in escrow until it is released or enters the treasury at recovery.`

### Glossary

- Structured data now lists every term as a `DefinedTerm` with its anchor (`#eol-token`, `#ctoken` and so on). If a definition changes on the page, change it in the script too.
- Optional: the H1 "One noun per object." does not name the page. Using "Glossary" as the H1 and moving the line into the lede gives crawlers the topic from the first heading.

### Integrate

- **Markup bug.** The third section's long paragraph ("Each project retains its own treasury...") sits inside `<p class="eyebrow">`, so it renders as a small label. Move it into a normal `<p>` under the H2 and give the eyebrow a short label, for example `RESERVE LAYER`.
- **DECIDE, cost claim.** "because the cost sits at the end of a token's life rather than at the start" describes an end-of-life cost that is not confirmed. Keep the sentence only once the cost is confirmed.
- **DECIDE, gold claim.** "A platform integrating today sits on all of it" implies the integrating platform benefits from the gold. FAQ and Glossary say gold stays at the cToken layer and is a fallback only if the base asset fails. One of the two descriptions has to change.

### Holders

- Subhero says "Transmuter tokens". The glossary noun is "EOL token". Replace with `EOL tokens`.

### Access

- No content changes. The form is still `mailto`, already on the launch list in the README.

## 4. Titles and descriptions against the positioning

Checked against the settled positioning, which targets builders only. Integrate and Holders are supporting pages and stay that way. Also checked: descriptor "Value recovery infrastructure for tokens", support line "Buyers can check the contract instead of taking your word", launching teams as the audience, and the excluded vocabulary (no "guarantee", no "trust" as a claimed quality, no recovery percentages, no framing of tokens as destined to fail). None of the six uses excluded vocabulary.

| Page | Status |
|---|---|
| Home | Aligned. Descriptor in the title, support line in the description, addressed to the launching team. |
| FAQ | Aligned. The previous description opened with "Most tokens leave holders with nothing", which sat close to the excluded framing; it is replaced. |
| Glossary | Aligned. Definitional, no claim. |
| Access | Aligned. Addressed to the launching team. |
| Integrate | Aligned. Supporting page: the positioning targets builders only, and integration for other launch platforms is published as additional information. The description names the page, it does not reposition the product. |
| Holders | Aligned. Supporting page: answers the questions a builder's buyers ask, without making holders a target. Stays indexed. |

## 5. Files attached

- `_redirects`: old domain to new domain page by page, non-www to www, old paths that may still be indexed, and a prepared Docs proxy line. Old-domain rules only work if `themidasinitiative.com` is attached to the same Netlify site [verify].
- `robots.txt`: allows all crawlers, AI crawlers included, and points to the sitemap.
- `sitemap.xml`: the six pages on `www.transmuter.net`.

## 6. After launch: final SEO and AEO audit

This is where the final work happens. Nothing below can be done on staging.

**Domain move**

- Verify `www.transmuter.net` and `themidasinitiative.com` in Google Search Console, then use its Change of Address tool to tell Google the site has moved. Do the same in Bing Webmaster Tools.
- Test every old URL: each must return one 301 to its new page, with no chains and no 404s.
- Ask sites that link to the old domain to update the link, starting with partner and backer pages.
- Search "Transmuter" and "The Midas Initiative" and record what shows. The previous homepage text was still the indexed description in August 2026, and `/docs` intermittently served the old specification.

**Indexing and markup**

- Submit the sitemap and inspect each of the six URLs in Search Console.
- Confirm the staging URL is not indexed.
- Run each page through Google's Rich Results Test and the Schema.org validator.
- Share a link on X and check the card shows the image, title and description.

**Performance**

- Run PageSpeed on the production URLs, mobile and desktop. Staging numbers do not carry over if hosting differs.
- Track Core Web Vitals in Search Console once there is enough traffic for field data.

**Full audit**

- Run the full SEO analysis on the live URL with the content strategy as context: keywords, on-page, AEO score and competitors. Search demand is judged against the three content subjects, and demand outside them is reported as demand not to chase.
- Test a fixed set of brand and category questions in ChatGPT, Perplexity and Google AI Overviews, and record which page is cited, as a baseline for later comparison.

**Updates tied to product milestones**

- Add the X profile to `sameAs` in the Organization block once the link is live.
- When the audit is published, update the FAQ answer "Are teams vetted or contracts audited?" and its schema together.
- If Docs runs on a separate platform, give it the same treatment: canonical, meta description, sitemap.

## 7. Head blocks

Paste each block as the first content of `<head>`, followed by the page's existing stylesheet links.

### Home `/`
```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#06060a"/>
<title>Transmuter: Value recovery infrastructure for tokens</title>
<meta name="description" content="Launch a Solana token with an isolated treasury, contract-owned liquidity and recovery rules fixed before trading, so buyers can check the contract."/>
<link rel="canonical" href="https://www.transmuter.net/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Transmuter"/>
<meta property="og:title" content="Transmuter: Value recovery infrastructure for tokens"/>
<meta property="og:description" content="Launch a Solana token with an isolated treasury, contract-owned liquidity and recovery rules fixed before trading, so buyers can check the contract."/>
<meta property="og:url" content="https://www.transmuter.net/"/>
<meta property="og:image" content="https://www.transmuter.net/og-image.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Transmuter: Value recovery infrastructure for tokens"/>
<meta name="twitter:description" content="Launch a Solana token with an isolated treasury, contract-owned liquidity and recovery rules fixed before trading, so buyers can check the contract."/>
<meta name="twitter:image" content="https://www.transmuter.net/og-image.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"/>
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@graph": [
  {
   "@type": "Organization",
   "@id": "https://www.transmuter.net/#organization",
   "name": "Transmuter",
   "alternateName": "The Midas Initiative",
   "url": "https://www.transmuter.net/",
   "logo": "https://www.transmuter.net/logo.png",
   "email": "info@transmuter.net",
   "description": "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading."
  },
  {
   "@type": "WebSite",
   "@id": "https://www.transmuter.net/#website",
   "url": "https://www.transmuter.net/",
   "name": "Transmuter",
   "publisher": {
    "@id": "https://www.transmuter.net/#organization"
   }
  },
  {
   "@type": "WebPage",
   "@id": "https://www.transmuter.net/#webpage",
   "url": "https://www.transmuter.net/",
   "name": "Transmuter: Value recovery infrastructure for tokens",
   "description": "Launch a Solana token with an isolated treasury, contract-owned liquidity and recovery rules fixed before trading, so buyers can check the contract.",
   "isPartOf": {
    "@id": "https://www.transmuter.net/#website"
   },
   "about": {
    "@id": "https://www.transmuter.net/#organization"
   },
   "inLanguage": "en"
  }
 ]
}
</script>
```

### FAQ `/faq/`
Followed by the existing `FAQPage` script with the fixes from section 3.
```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#06060a"/>
<title>Transmuter FAQ: reserves, escrow, governance and recovery</title>
<meta name="description" content="How tokens launched on Transmuter are backed, who can move funds, how escrow and governance work, what recovery pays, and where the system stops."/>
<link rel="canonical" href="https://www.transmuter.net/faq/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Transmuter"/>
<meta property="og:title" content="Transmuter FAQ: reserves, escrow, governance and recovery"/>
<meta property="og:description" content="How tokens launched on Transmuter are backed, who can move funds, how escrow and governance work, what recovery pays, and where the system stops."/>
<meta property="og:url" content="https://www.transmuter.net/faq/"/>
<meta property="og:image" content="https://www.transmuter.net/og-image.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Transmuter FAQ: reserves, escrow, governance and recovery"/>
<meta name="twitter:description" content="How tokens launched on Transmuter are backed, who can move funds, how escrow and governance work, what recovery pays, and where the system stops."/>
<meta name="twitter:image" content="https://www.transmuter.net/og-image.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"/>
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@graph": [
  {
   "@type": "Organization",
   "@id": "https://www.transmuter.net/#organization",
   "name": "Transmuter",
   "alternateName": "The Midas Initiative",
   "url": "https://www.transmuter.net/",
   "logo": "https://www.transmuter.net/logo.png",
   "email": "info@transmuter.net",
   "description": "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading."
  },
  {
   "@type": "WebPage",
   "@id": "https://www.transmuter.net/faq/#webpage",
   "url": "https://www.transmuter.net/faq/",
   "name": "Transmuter FAQ: reserves, escrow, governance and recovery",
   "description": "How tokens launched on Transmuter are backed, who can move funds, how escrow and governance work, what recovery pays, and where the system stops.",
   "isPartOf": {
    "@id": "https://www.transmuter.net/#website"
   },
   "about": {
    "@id": "https://www.transmuter.net/#organization"
   },
   "inLanguage": "en"
  },
  {
   "@type": "BreadcrumbList",
   "itemListElement": [
    {
     "@type": "ListItem",
     "position": 1,
     "name": "Transmuter",
     "item": "https://www.transmuter.net/"
    },
    {
     "@type": "ListItem",
     "position": 2,
     "name": "FAQ",
     "item": "https://www.transmuter.net/faq/"
    }
   ]
  }
 ]
}
</script>
```

### Glossary `/glossary/`
```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#06060a"/>
<title>Transmuter glossary: EOL token, cToken, escrow, recovery</title>
<meta name="description" content="Definitions of the terms used across Transmuter: EOL token, cToken, escrow, contract-owned liquidity, Mint to Scale, recovery and the contingency layer."/>
<link rel="canonical" href="https://www.transmuter.net/glossary/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Transmuter"/>
<meta property="og:title" content="Transmuter glossary: EOL token, cToken, escrow, recovery"/>
<meta property="og:description" content="Definitions of the terms used across Transmuter: EOL token, cToken, escrow, contract-owned liquidity, Mint to Scale, recovery and the contingency layer."/>
<meta property="og:url" content="https://www.transmuter.net/glossary/"/>
<meta property="og:image" content="https://www.transmuter.net/og-image.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Transmuter glossary: EOL token, cToken, escrow, recovery"/>
<meta name="twitter:description" content="Definitions of the terms used across Transmuter: EOL token, cToken, escrow, contract-owned liquidity, Mint to Scale, recovery and the contingency layer."/>
<meta name="twitter:image" content="https://www.transmuter.net/og-image.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"/>
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@graph": [
  {
   "@type": "Organization",
   "@id": "https://www.transmuter.net/#organization",
   "name": "Transmuter",
   "alternateName": "The Midas Initiative",
   "url": "https://www.transmuter.net/",
   "logo": "https://www.transmuter.net/logo.png",
   "email": "info@transmuter.net",
   "description": "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading."
  },
  {
   "@type": "WebPage",
   "@id": "https://www.transmuter.net/glossary/#webpage",
   "url": "https://www.transmuter.net/glossary/",
   "name": "Transmuter glossary: EOL token, cToken, escrow, recovery",
   "description": "Definitions of the terms used across Transmuter: EOL token, cToken, escrow, contract-owned liquidity, Mint to Scale, recovery and the contingency layer.",
   "isPartOf": {
    "@id": "https://www.transmuter.net/#website"
   },
   "about": {
    "@id": "https://www.transmuter.net/#organization"
   },
   "inLanguage": "en"
  },
  {
   "@type": "BreadcrumbList",
   "itemListElement": [
    {
     "@type": "ListItem",
     "position": 1,
     "name": "Transmuter",
     "item": "https://www.transmuter.net/"
    },
    {
     "@type": "ListItem",
     "position": 2,
     "name": "Glossary",
     "item": "https://www.transmuter.net/glossary/"
    }
   ]
  },
  {
   "@type": "DefinedTermSet",
   "@id": "https://www.transmuter.net/glossary/#terms",
   "name": "Transmuter glossary",
   "url": "https://www.transmuter.net/glossary/",
   "hasDefinedTerm": [
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#eol-token",
     "name": "EOL token",
     "description": "The token a project launches on Transmuter. It trades and behaves like an ordinary token, and it carries reserves underneath it from the first block plus a defined procedure for what happens if the project is finished.",
     "url": "https://www.transmuter.net/glossary/#eol-token",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#ctoken",
     "name": "cToken",
     "description": "The reserve layer a project's reserves are held in, either cSOL or cBTC. Nobody holds one. It is not bought, traded or redeemed directly, and what a person holds is the EOL token above it. It exists so that everything standing behind a token, including the gold beneath it, reads as one figure.",
     "url": "https://www.transmuter.net/glossary/#ctoken",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#escrow",
     "name": "Escrow",
     "description": "An optional, non-custodial team runway. A project can launch with no escrow. If an escrow schedule is set, it cannot be rewritten; holders may pause, unpause or advance a tranche. Unspent escrow enters the treasury only at recovery.",
     "url": "https://www.transmuter.net/glossary/#escrow",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#contract-owned-liquidity",
     "name": "Contract-owned liquidity",
     "description": "The token's core liquidity position, owned by the contract rather than by the team, built from the same transaction flow that feeds the reserves.",
     "url": "https://www.transmuter.net/glossary/#contract-owned-liquidity",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#mint-to-scale",
     "name": "Mint to Scale",
     "description": "An exchange that opens automatically when backing stays below the threshold. A minter pays in above market, the proceeds enter the reserve, and tokens are issued back to them, so it adds more backing than it adds claims. It does not open above healthy backing.",
     "url": "https://www.transmuter.net/glossary/#mint-to-scale",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#minting",
     "name": "Minting",
     "description": "Paying into a token's reserve and receiving tokens in return. The payment enters the cSOL treasury, cSOL is minted into that EOL token's own reserve, and the tokens go to the minter. It is the one input to the reserve that is a purchase rather than an accrual.",
     "url": "https://www.transmuter.net/glossary/#minting",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#recovery",
     "name": "Recovery",
     "description": "The end-of-life procedure: a gate on when a proposal can open, a governance vote, and then contract-defined consolidation, burns and pro rata distribution. The accounting steps run without a team signature after approval.",
     "url": "https://www.transmuter.net/glossary/#recovery",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#pro-rata-distribution",
     "name": "Pro rata distribution",
     "description": "Every holder receives the same share of reserves per token held, with no threshold to clear and no claim to file.",
     "url": "https://www.transmuter.net/glossary/#pro-rata-distribution",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    },
    {
     "@type": "DefinedTerm",
     "@id": "https://www.transmuter.net/glossary/#contingency-layer",
     "name": "Contingency layer",
     "description": "Gold held as a contingency beneath a cToken base asset. It stays at the cToken layer when an ordinary project closes and is a fallback if the base asset itself fails. A gold primary reserve has different redemption rights.",
     "url": "https://www.transmuter.net/glossary/#contingency-layer",
     "inDefinedTermSet": {
      "@id": "https://www.transmuter.net/glossary/#terms"
     }
    }
   ]
  }
 ]
}
</script>
```

### Integrate `/integrate/`
```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#06060a"/>
<title>Integrate Transmuter beneath your own launch product</title>
<meta name="description" content="Launch platforms can add Transmuter reserves, governed escrow, contract-owned liquidity and recovery beneath their own product and brand."/>
<link rel="canonical" href="https://www.transmuter.net/integrate/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Transmuter"/>
<meta property="og:title" content="Integrate Transmuter beneath your own launch product"/>
<meta property="og:description" content="Launch platforms can add Transmuter reserves, governed escrow, contract-owned liquidity and recovery beneath their own product and brand."/>
<meta property="og:url" content="https://www.transmuter.net/integrate/"/>
<meta property="og:image" content="https://www.transmuter.net/og-image.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Integrate Transmuter beneath your own launch product"/>
<meta name="twitter:description" content="Launch platforms can add Transmuter reserves, governed escrow, contract-owned liquidity and recovery beneath their own product and brand."/>
<meta name="twitter:image" content="https://www.transmuter.net/og-image.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"/>
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@graph": [
  {
   "@type": "Organization",
   "@id": "https://www.transmuter.net/#organization",
   "name": "Transmuter",
   "alternateName": "The Midas Initiative",
   "url": "https://www.transmuter.net/",
   "logo": "https://www.transmuter.net/logo.png",
   "email": "info@transmuter.net",
   "description": "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading."
  },
  {
   "@type": "WebPage",
   "@id": "https://www.transmuter.net/integrate/#webpage",
   "url": "https://www.transmuter.net/integrate/",
   "name": "Integrate Transmuter beneath your own launch product",
   "description": "Launch platforms can add Transmuter reserves, governed escrow, contract-owned liquidity and recovery beneath their own product and brand.",
   "isPartOf": {
    "@id": "https://www.transmuter.net/#website"
   },
   "about": {
    "@id": "https://www.transmuter.net/#organization"
   },
   "inLanguage": "en"
  },
  {
   "@type": "BreadcrumbList",
   "itemListElement": [
    {
     "@type": "ListItem",
     "position": 1,
     "name": "Transmuter",
     "item": "https://www.transmuter.net/"
    },
    {
     "@type": "ListItem",
     "position": 2,
     "name": "Launch platforms",
     "item": "https://www.transmuter.net/integrate/"
    }
   ]
  }
 ]
}
</script>
```

### Holders `/holders/`
```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#06060a"/>
<title>For holders: what stands behind an EOL token | Transmuter</title>
<meta name="description" content="What stands behind an EOL token, what triggers recovery, what recovery pays per token held, and what the protocol does not do."/>
<link rel="canonical" href="https://www.transmuter.net/holders/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Transmuter"/>
<meta property="og:title" content="For holders: what stands behind an EOL token | Transmuter"/>
<meta property="og:description" content="What stands behind an EOL token, what triggers recovery, what recovery pays per token held, and what the protocol does not do."/>
<meta property="og:url" content="https://www.transmuter.net/holders/"/>
<meta property="og:image" content="https://www.transmuter.net/og-image.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="For holders: what stands behind an EOL token | Transmuter"/>
<meta name="twitter:description" content="What stands behind an EOL token, what triggers recovery, what recovery pays per token held, and what the protocol does not do."/>
<meta name="twitter:image" content="https://www.transmuter.net/og-image.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"/>
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@graph": [
  {
   "@type": "Organization",
   "@id": "https://www.transmuter.net/#organization",
   "name": "Transmuter",
   "alternateName": "The Midas Initiative",
   "url": "https://www.transmuter.net/",
   "logo": "https://www.transmuter.net/logo.png",
   "email": "info@transmuter.net",
   "description": "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading."
  },
  {
   "@type": "WebPage",
   "@id": "https://www.transmuter.net/holders/#webpage",
   "url": "https://www.transmuter.net/holders/",
   "name": "For holders: what stands behind an EOL token | Transmuter",
   "description": "What stands behind an EOL token, what triggers recovery, what recovery pays per token held, and what the protocol does not do.",
   "isPartOf": {
    "@id": "https://www.transmuter.net/#website"
   },
   "about": {
    "@id": "https://www.transmuter.net/#organization"
   },
   "inLanguage": "en"
  },
  {
   "@type": "BreadcrumbList",
   "itemListElement": [
    {
     "@type": "ListItem",
     "position": 1,
     "name": "Transmuter",
     "item": "https://www.transmuter.net/"
    },
    {
     "@type": "ListItem",
     "position": 2,
     "name": "Holders",
     "item": "https://www.transmuter.net/holders/"
    }
   ]
  }
 ]
}
</script>
```

### Access `/access/`
```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#06060a"/>
<title>Get early access to Transmuter</title>
<meta name="description" content="Tell us what you are launching and we will come back with what your token's structure would look like on Transmuter."/>
<link rel="canonical" href="https://www.transmuter.net/access/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Transmuter"/>
<meta property="og:title" content="Get early access to Transmuter"/>
<meta property="og:description" content="Tell us what you are launching and we will come back with what your token's structure would look like on Transmuter."/>
<meta property="og:url" content="https://www.transmuter.net/access/"/>
<meta property="og:image" content="https://www.transmuter.net/og-image.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Get early access to Transmuter"/>
<meta name="twitter:description" content="Tell us what you are launching and we will come back with what your token's structure would look like on Transmuter."/>
<meta name="twitter:image" content="https://www.transmuter.net/og-image.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"/>
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@graph": [
  {
   "@type": "Organization",
   "@id": "https://www.transmuter.net/#organization",
   "name": "Transmuter",
   "alternateName": "The Midas Initiative",
   "url": "https://www.transmuter.net/",
   "logo": "https://www.transmuter.net/logo.png",
   "email": "info@transmuter.net",
   "description": "Transmuter is value recovery infrastructure for tokens on Solana. Tokens launch with an isolated treasury, contract-owned liquidity and recovery rules defined before trading."
  },
  {
   "@type": "WebPage",
   "@id": "https://www.transmuter.net/access/#webpage",
   "url": "https://www.transmuter.net/access/",
   "name": "Get early access to Transmuter",
   "description": "Tell us what you are launching and we will come back with what your token's structure would look like on Transmuter.",
   "isPartOf": {
    "@id": "https://www.transmuter.net/#website"
   },
   "about": {
    "@id": "https://www.transmuter.net/#organization"
   },
   "inLanguage": "en"
  },
  {
   "@type": "BreadcrumbList",
   "itemListElement": [
    {
     "@type": "ListItem",
     "position": 1,
     "name": "Transmuter",
     "item": "https://www.transmuter.net/"
    },
    {
     "@type": "ListItem",
     "position": 2,
     "name": "Early access",
     "item": "https://www.transmuter.net/access/"
    }
   ]
  }
 ]
}
</script>
```
