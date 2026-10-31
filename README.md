# StackSense

A tech stack recommender that takes real project constraints (scale, team size, skills, budget, infra, cloud, compliance, data shape) and returns a frontend, backend, database and hosting combo, with the score breakdown for every pick.

Live: https://stacksense-aman.vercel.app

Built for the StackSense Challenge, Synergy '26, IIIT Bangalore.

## Why rule based

Stack advice from a chatbot sounds confident but you cannot see why it picked Postgres over Mongo, and it changes on every run. StackSense is deterministic. Same inputs, same stack, and every point in the score is traceable to one input.

## How it works

```
inputs (15 params)
   |
normalize + edge case detector  ->  warnings (conflicts, unrealistic combos)
   |
per layer: hard constraint filter  ->  eliminated options + reason
   |
per layer: weighted soft scoring   ->  0..100 score, factor breakdown
   |
cross layer pass over top 4 x 4 x 4 x 4 combos
   (compatibility penalties and bonuses)
   |
best stack + runner ups + cost estimate + add ons
```

1. **Normalize.** Bad values are clamped (team size 1 to 500, budget >= 0, unknown scale falls back to small).
2. **Edge cases.** 11 checks such as zero budget at 5M users, HIPAA on a tiny budget, realtime on pure serverless, on-prem with a cloud preference, mobile plus SEO.
3. **Hard filters.** Options that break a must have are removed with a reason: on-prem vs managed only, cloud lock in, budget floor of a host, India data residency, HIPAA BAA, PCI needing strong ACID, SQLite at scale.
4. **Soft scoring.** Each layer has its own factors. Weights depend on the inputs, so "SEO" weighs 3 when SEO is needed and 0.5 when it is not. Score = weighted mean of option attributes (1 to 5), scaled to 100. Each factor's share of points is shown in the UI.
5. **Cross layer pass.** The top 4 per layer are combined (256 combos) and penalized for bad pairings: SQLite on ephemeral serverless, DynamoDB with a GCP host, Spring on Lambda cold starts, Supabase without Postgres, HTMX without a server. One language across frontend and backend gets a small bonus.
6. **Output.** Stack, per layer runner up and gap, options ruled out, monthly cost band, extras (cache, queue, CDN, inference worker, audit logging).

## Catalog

8 frontends, 8 backends, 9 databases, 9 hosting targets. Attributes are in `src/engine.js` and are based on public docs and pricing pages (see the report for sources).

## Run locally

No dependencies.

```bash
git clone https://github.com/amantebriwal4321/stacksense
cd stacksense
npm run build          # copies the engine into public/
npx serve public       # or: python3 -m http.server -d public 8080
npm test               # 10 engine tests
node src/cli.js '{"scale":"large","skills":["go"],"budget":800,"realtime":true}'
```

## Project layout

```
src/engine.js      scoring engine (works in browser and Node)
src/cli.js         command line version
public/            UI (index.html, app.js, style.css)
test/              engine tests
docs/              report source
```

## Inputs

| Param | Values |
|---|---|
| projectType | saas, ecommerce, fintech, social, content, analytics, internal |
| dataModel | relational, document, keyvalue, timeseries, graph, geo |
| scale | tiny, small, medium, large, massive (MAU bands) |
| traffic | steady, spiky |
| teamSize | 1 to 500 |
| skills | ts, py, go, java, php, dart |
| timeToMarket | asap, normal, long |
| budget | USD per month |
| infra | any, serverless, containers, onprem |
| cloud | any, aws, gcp |
| compliance | none, pci, hipaa |
| seo, realtime, mobile, ml, residencyIN | booleans |

## Limits

Prices and attributes are a snapshot from Oct 2026. Cost is a rough band, not a quote. Azure is not in the catalog yet.

## License

MIT
