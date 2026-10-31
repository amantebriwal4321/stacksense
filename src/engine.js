// StackSense engine: hard-constraint filtering + weighted soft scoring per layer,
// then a cross-layer compatibility pass. Pure functions, no network, no deps.
(function (root) {
  const TIERS = { tiny: 1, small: 2, medium: 3, large: 4, massive: 5 };
  // users per month bands for scale tiers
  const SCALE_LABEL = { tiny: '< 1k MAU', small: '1k to 50k MAU', medium: '50k to 500k MAU', large: '500k to 5M MAU', massive: '5M+ MAU' };

  // Catalog. Each option has attributes the scorer reads. Numbers are 1..5 unless noted.
  const CATALOG = {
    frontend: [
      { id: 'nextjs', name: 'Next.js (React)', lang: 'ts', seo: 5, interactivity: 5, learn: 3, ecosystem: 5, mobileShare: 3, staticOk: true, ssr: true, hire: 5, note: 'SSR, SSG and ISR in one framework, huge React ecosystem' },
      { id: 'react-vite', name: 'React + Vite (SPA)', lang: 'ts', seo: 2, interactivity: 5, learn: 4, ecosystem: 5, mobileShare: 3, staticOk: true, ssr: false, hire: 5, note: 'Fast client app, any static host, weak SEO without prerender' },
      { id: 'sveltekit', name: 'SvelteKit', lang: 'ts', seo: 5, interactivity: 5, learn: 4, ecosystem: 3, mobileShare: 1, staticOk: true, ssr: true, hire: 2, note: 'Small bundles, simple mental model, smaller hiring pool' },
      { id: 'astro', name: 'Astro', lang: 'ts', seo: 5, interactivity: 2, learn: 5, ecosystem: 3, mobileShare: 1, staticOk: true, ssr: true, hire: 2, note: 'Ships near zero JS, great for content and docs sites' },
      { id: 'angular', name: 'Angular', lang: 'ts', seo: 3, interactivity: 5, learn: 2, ecosystem: 4, mobileShare: 2, staticOk: true, ssr: true, hire: 4, note: 'Batteries included, strong typing, suits big enterprise teams' },
      { id: 'htmx', name: 'Server templates + HTMX', lang: 'any', seo: 5, interactivity: 3, learn: 5, ecosystem: 2, mobileShare: 1, staticOk: false, ssr: true, hire: 3, note: 'No build step, HTML over the wire, ideal for CRUD internal tools' },
      { id: 'flutter', name: 'Flutter (mobile + web)', lang: 'dart', seo: 1, interactivity: 5, learn: 3, ecosystem: 3, mobileShare: 5, staticOk: true, ssr: false, hire: 3, note: 'One codebase for Android, iOS and web' },
      { id: 'react-native', name: 'React Native (Expo)', lang: 'ts', seo: 1, interactivity: 5, learn: 3, ecosystem: 4, mobileShare: 5, staticOk: true, ssr: false, hire: 4, note: 'Native mobile apps reusing React skills' }
    ],
    backend: [
      { id: 'node-nest', name: 'Node.js + NestJS', lang: 'ts', perf: 3, concurrency: 4, realtime: 5, ml: 1, learn: 3, structure: 5, serverless: 3, hire: 5, note: 'Typed modules, DI, first class WebSockets' },
      { id: 'node-express', name: 'Node.js + Express/Fastify', lang: 'ts', perf: 3, concurrency: 4, realtime: 5, ml: 1, learn: 5, structure: 2, serverless: 5, hire: 5, note: 'Minimal and quick to ship, shares language with the frontend' },
      { id: 'fastapi', name: 'Python + FastAPI', lang: 'py', perf: 3, concurrency: 3, realtime: 3, ml: 5, learn: 5, structure: 3, serverless: 4, hire: 4, note: 'Async Python, auto OpenAPI, direct access to the ML ecosystem' },
      { id: 'django', name: 'Python + Django', lang: 'py', perf: 2, concurrency: 2, realtime: 2, ml: 4, learn: 4, structure: 5, serverless: 2, hire: 4, note: 'Admin, ORM and auth out of the box' },
      { id: 'go', name: 'Go (chi / Gin)', lang: 'go', perf: 5, concurrency: 5, realtime: 4, ml: 1, learn: 3, structure: 3, serverless: 4, hire: 3, note: 'Single static binary, low memory, great for high RPS' },
      { id: 'spring', name: 'Java + Spring Boot', lang: 'java', perf: 4, concurrency: 4, realtime: 3, ml: 2, learn: 2, structure: 5, serverless: 1, hire: 4, note: 'Mature enterprise stack, strong for compliance heavy domains' },
      { id: 'laravel', name: 'PHP + Laravel', lang: 'php', perf: 2, concurrency: 2, realtime: 2, ml: 1, learn: 4, structure: 4, serverless: 2, hire: 3, note: 'Very fast CRUD delivery, cheap shared hosting' },
      { id: 'baas', name: 'Supabase (BaaS: Postgres + auth + realtime)', lang: 'any', perf: 3, concurrency: 3, realtime: 4, ml: 1, learn: 5, structure: 2, serverless: 5, hire: 4, managedOnly: true, note: 'Skip writing most of the backend, row level security in SQL' }
    ],
    database: [
      { id: 'postgres', name: 'PostgreSQL', model: ['relational', 'document', 'geo'], acid: 5, scale: 4, ops: 3, cost: 4, analytics: 3, selfHost: true, note: 'ACID, JSONB, PostGIS, extensions for almost anything' },
      { id: 'mysql', name: 'MySQL', model: ['relational'], acid: 4, scale: 4, ops: 4, cost: 5, analytics: 2, selfHost: true, note: 'Proven OLTP, cheap everywhere' },
      { id: 'mongodb', name: 'MongoDB', model: ['document'], acid: 3, scale: 4, ops: 3, cost: 3, analytics: 2, selfHost: true, note: 'Flexible schema, easy horizontal sharding' },
      { id: 'dynamodb', name: 'DynamoDB', model: ['keyvalue', 'document'], acid: 3, scale: 5, ops: 5, cost: 3, analytics: 1, selfHost: false, cloud: 'aws', note: 'Serverless, single digit ms at any scale, needs access patterns upfront' },
      { id: 'firestore', name: 'Firestore', model: ['document'], acid: 3, scale: 4, ops: 5, cost: 3, analytics: 1, selfHost: false, cloud: 'gcp', realtime: true, note: 'Realtime listeners and offline sync for mobile' },
      { id: 'cockroach', name: 'CockroachDB', model: ['relational'], acid: 5, scale: 5, ops: 3, cost: 2, analytics: 2, selfHost: true, note: 'Distributed SQL, multi region writes' },
      { id: 'timescale', name: 'TimescaleDB (Postgres)', model: ['timeseries', 'relational'], acid: 5, scale: 4, ops: 3, cost: 4, analytics: 4, selfHost: true, note: 'Hypertables and compression for metrics and IoT' },
      { id: 'neo4j', name: 'Neo4j', model: ['graph'], acid: 4, scale: 3, ops: 2, cost: 2, analytics: 3, selfHost: true, note: 'Native graph traversals for relationship heavy data' },
      { id: 'sqlite', name: 'SQLite', model: ['relational'], acid: 4, scale: 1, ops: 5, cost: 5, analytics: 2, selfHost: true, note: 'Zero ops, file based, perfect for tiny or edge apps' }
    ],
    hosting: [
      { id: 'vercel', name: 'Vercel', kind: 'paas', serverless: true, longRunning: false, sockets: false, minCost: 0, scale: 4, ops: 5, onPrem: false, regionsIN: true, cloud: 'any', compliance: 3, note: 'Git push deploys, edge network, best fit for Next.js' },
      { id: 'render', name: 'Render / Railway', kind: 'paas', serverless: false, longRunning: true, sockets: true, minCost: 7, scale: 3, ops: 5, onPrem: false, regionsIN: false, cloud: 'any', compliance: 2, note: 'Containers and workers without touching infra' },
      { id: 'cloudrun', name: 'Google Cloud Run', kind: 'container', serverless: true, longRunning: true, sockets: true, minCost: 0, scale: 5, ops: 4, onPrem: false, regionsIN: true, cloud: 'gcp', compliance: 4, note: 'Scale to zero containers, Mumbai and Delhi regions' },
      { id: 'aws-lambda', name: 'AWS Lambda + API Gateway', kind: 'faas', serverless: true, longRunning: false, sockets: true, minCost: 0, scale: 5, ops: 4, onPrem: false, regionsIN: true, cloud: 'aws', compliance: 5, note: 'Pay per request, deep AWS integration, ap-south-1' },
      { id: 'aws-ecs', name: 'AWS ECS Fargate + RDS', kind: 'container', serverless: false, longRunning: true, sockets: true, minCost: 60, scale: 5, ops: 3, onPrem: false, regionsIN: true, cloud: 'aws', compliance: 5, note: 'Managed containers for steady heavy traffic' },
      { id: 'k8s', name: 'Kubernetes (EKS / GKE / AKS)', kind: 'k8s', serverless: false, longRunning: true, sockets: true, minCost: 150, scale: 5, ops: 1, onPrem: false, regionsIN: true, cloud: 'any', compliance: 5, note: 'Max control and portability, needs real platform skills' },
      { id: 'vps', name: 'Single VPS (Docker Compose)', kind: 'vm', serverless: false, longRunning: true, sockets: true, minCost: 5, scale: 2, ops: 2, onPrem: false, regionsIN: true, cloud: 'any', compliance: 2, note: 'Cheapest predictable bill, you own patching' },
      { id: 'onprem', name: 'On-prem (Docker / k3s)', kind: 'onprem', serverless: false, longRunning: true, sockets: true, minCost: 0, scale: 3, ops: 1, onPrem: true, regionsIN: true, cloud: 'none', compliance: 5, note: 'Data never leaves your hardware' },
      { id: 'firebase', name: 'Firebase Hosting + Functions', kind: 'faas', serverless: true, longRunning: false, sockets: false, minCost: 0, scale: 4, ops: 5, onPrem: false, regionsIN: true, cloud: 'gcp', compliance: 3, note: 'Tight fit with Firestore and mobile SDKs' }
    ]
  };

  const DEFAULTS = {
    projectType: 'saas', scale: 'small', traffic: 'steady', teamSize: 3, skills: ['ts'],
    budget: 50, infra: 'any', cloud: 'any', dataModel: 'relational', realtime: false,
    seo: false, mobile: false, ml: false, compliance: 'none', timeToMarket: 'normal', residencyIN: false
  };

  const LANG_NAMES = { ts: 'JavaScript/TypeScript', py: 'Python', go: 'Go', java: 'Java', php: 'PHP', dart: 'Dart' };

  function normalize(raw) {
    const p = Object.assign({}, DEFAULTS, raw || {});
    p.teamSize = Math.max(1, Math.min(500, parseInt(p.teamSize, 10) || 1));
    p.budget = Math.max(0, Number(p.budget) || 0);
    if (!Array.isArray(p.skills) || !p.skills.length) p.skills = [];
    if (!TIERS[p.scale]) p.scale = 'small';
    return p;
  }

  // Detect conflicting or risky inputs. These are edge cases we surface instead of hiding.
  function checkEdgeCases(p) {
    const w = [];
    const s = TIERS[p.scale];
    if (p.budget === 0 && s >= 4) w.push('Zero budget with ' + SCALE_LABEL[p.scale] + ' is not realistic. Picks assume free tiers and will hit limits, plan for paid tiers early.');
    if (p.budget < 20 && p.compliance !== 'none') w.push('Compliance (' + p.compliance.toUpperCase() + ') usually needs paid audit logging, backups and encryption. Budget under $20/mo is a risk.');
    if (p.infra === 'onprem' && p.cloud !== 'any') w.push('On-prem was chosen, so the cloud preference (' + p.cloud + ') is ignored.');
    if (p.infra === 'serverless' && p.dataModel === 'graph') w.push('Graph databases are rarely serverless friendly. Expect a long running DB instance even with serverless compute.');
    if (p.teamSize === 1 && s >= 4) w.push('Solo builder at large scale: managed services are favored heavily to keep ops near zero.');
    if (p.teamSize >= 30 && p.timeToMarket === 'asap') w.push('Big team plus ASAP: structure matters more than raw speed, so opinionated frameworks get a boost.');
    if (!p.skills.length) w.push('No team skills given. Scoring falls back to hiring pool size and learning curve.');
    if (p.mobile && p.seo) w.push('Mobile first and SEO both asked for. A native app cannot rank on Google, so the web layer is chosen for SEO and a mobile client is listed separately.');
    if (p.realtime && p.infra === 'serverless') w.push('Realtime on pure serverless needs a managed socket layer (Supabase Realtime, Pusher, Ably or API Gateway WebSockets).');
    if (p.residencyIN && p.infra !== 'onprem') w.push('India data residency: only hosts with Indian regions are kept (DPDP Act 2023).');
    if (p.traffic === 'spiky' && p.infra === 'onprem') w.push('Spiky traffic on fixed on-prem hardware: size for peak or add a queue to absorb bursts.');
    return w;
  }

  const clamp = (x) => Math.max(0, Math.min(5, x));

  // Each scorer returns {eliminated?: reason, factors: [[label, weight, value0to5]]}
  function scoreFrontend(o, p) {
    if (p.mobile && !p.seo && o.mobileShare < 3) return { eliminated: 'mobile app needed, this is web only' };
    if (!p.mobile && o.mobileShare === 5 && o.seo === 1) return { eliminated: 'mobile framework, project is web only' };
    const s = TIERS[p.scale];
    const skill = o.lang === 'any' ? 3.5 : p.skills.includes(o.lang) ? 5 : (o.lang === 'dart' ? 1 : 2);
    const f = [
      ['Team skill match', 3, skill],
      ['SEO need', p.seo ? 3 : 0.5, o.seo],
      ['Interactivity for ' + p.projectType, ['internal', 'content'].includes(p.projectType) ? 1 : 2.5, o.interactivity],
      ['Mobile code sharing', p.mobile ? 3 : 0, o.mobileShare],
      ['Learning curve vs deadline', p.timeToMarket === 'asap' ? 2.5 : 1, o.learn],
      ['Ecosystem and hiring', 1 + (p.teamSize >= 10 ? 1.5 : 0) + (s >= 4 ? 0.5 : 0), (o.ecosystem + o.hire) / 2],
      ['Content site fit', p.projectType === 'content' ? 3 : 0, o.id === 'astro' ? 5 : o.seo >= 5 ? 4 : 1],
      ['Internal tool fit', p.projectType === 'internal' ? 2.5 : 0, o.id === 'htmx' ? 5 : o.id === 'react-vite' ? 4 : 2],
      ['Enterprise structure', p.teamSize >= 25 ? 2 : 0, o.id === 'angular' ? 5 : o.id === 'nextjs' ? 4 : 2]
    ];
    return { factors: f };
  }

  function scoreBackend(o, p) {
    if (o.managedOnly && p.infra === 'onprem') return { eliminated: 'managed only service, on-prem required' };
    if (o.managedOnly && (p.compliance === 'hipaa')) return { eliminated: 'HIPAA needs a BAA and audited custom logic, BaaS on free or pro tiers does not cover it' };
    const s = TIERS[p.scale];
    const skill = o.lang === 'any' ? 3.5 : p.skills.includes(o.lang) ? 5 : 1.5;
    const f = [
      ['Team skill match', 3.5, skill],
      ['Throughput at ' + SCALE_LABEL[p.scale], s >= 4 ? 3 : s === 3 ? 1.5 : 0.5, (o.perf + o.concurrency) / 2],
      ['Realtime support', p.realtime ? 3 : 0, o.realtime],
      ['ML / AI integration', p.ml ? 3.5 : 0, o.ml],
      ['Speed to ship', p.timeToMarket === 'asap' ? 3 : p.timeToMarket === 'normal' ? 1 : 0.3, o.learn],
      ['Code structure for team of ' + p.teamSize, p.teamSize >= 10 ? 2.5 : p.teamSize >= 4 ? 1 : 0.3, o.structure],
      ['Serverless fit', p.infra === 'serverless' ? 3 : p.traffic === 'spiky' ? 1.5 : 0, o.serverless],
      ['Compliance maturity', p.compliance !== 'none' ? 2 : 0, o.id === 'spring' ? 5 : o.id === 'baas' ? 2 : 3.5],
      ['Small team ops', p.teamSize <= 2 ? 2 : 0, o.id === 'baas' ? 5 : o.learn]
    ];
    return { factors: f };
  }

  function scoreDatabase(o, p) {
    if (p.infra === 'onprem' && !o.selfHost) return { eliminated: 'cloud only, on-prem required' };
    if (o.cloud && p.cloud !== 'any' && p.cloud !== o.cloud && p.infra !== 'onprem') return { eliminated: 'locked to ' + o.cloud.toUpperCase() + ', you chose ' + p.cloud.toUpperCase() };
    if (o.id === 'sqlite' && (TIERS[p.scale] >= 3 || p.teamSize > 5)) return { eliminated: 'single writer file DB, too small for this scale or team' };
    if (p.compliance === 'pci' && o.acid < 4) return { eliminated: 'PCI payments need strong ACID guarantees' };
    const s = TIERS[p.scale];
    const fit = o.model.includes(p.dataModel) ? 5 : (p.dataModel === 'keyvalue' && o.model.includes('document')) ? 3 : (o.id === 'postgres' ? 3 : 1);
    const f = [
      ['Data model fit (' + p.dataModel + ')', 4, fit],
      ['Transactions / consistency', ['ecommerce', 'fintech'].includes(p.projectType) || p.compliance === 'pci' ? 3 : 1, o.acid],
      ['Horizontal scale', s >= 4 ? 3 : s === 3 ? 1.5 : 0.3, o.scale],
      ['Low ops burden', p.teamSize <= 3 ? 2.5 : 1, o.ops],
      ['Cost efficiency', p.budget < 50 ? 2.5 : 1, o.cost],
      ['Analytics queries', p.ml || p.projectType === 'analytics' ? 2 : 0, o.analytics],
      ['Mobile offline sync', p.mobile ? 1.5 : 0, o.realtime ? 5 : 2],
      ['Cloud alignment', p.cloud !== 'any' && o.cloud === p.cloud ? 1.5 : 0, 5]
    ];
    return { factors: f };
  }

  function scoreHosting(o, p) {
    if (p.infra === 'onprem' && !o.onPrem) return { eliminated: 'not on-prem' };
    if (p.infra !== 'onprem' && o.onPrem) return { eliminated: 'on-prem not required, adds hardware ops' };
    if (p.infra === 'serverless' && !o.serverless) return { eliminated: 'not serverless' };
    if (p.infra === 'containers' && !['container', 'k8s', 'paas', 'vm'].includes(o.kind)) return { eliminated: 'not container based' };
    if (p.cloud !== 'any' && o.cloud !== 'any' && o.cloud !== 'none' && o.cloud !== p.cloud && p.infra !== 'onprem') return { eliminated: 'runs on ' + o.cloud.toUpperCase() + ', you chose ' + p.cloud.toUpperCase() };
    if (p.residencyIN && !o.regionsIN) return { eliminated: 'no India region for data residency' };
    if (o.minCost > p.budget) return { eliminated: 'baseline about $' + o.minCost + '/mo is over the $' + p.budget + '/mo budget' };
    if (p.compliance === 'hipaa' && o.compliance < 4) return { eliminated: 'no HIPAA BAA on standard plans' };
    const s = TIERS[p.scale];
    const f = [
      ['Scale headroom', s >= 4 ? 3 : 1, o.scale],
      ['Ops effort for team of ' + p.teamSize, p.teamSize <= 5 ? 3 : 1, o.ops],
      ['Spiky traffic (scale to zero)', p.traffic === 'spiky' ? 2.5 : 0, o.serverless ? 5 : 2],
      ['Long running / sockets', p.realtime || p.ml ? 2.5 : 0.5, o.sockets && o.longRunning ? 5 : o.sockets ? 3.5 : 1],
      ['Budget fit', 2, clamp(5 - (o.minCost / Math.max(p.budget, 1)) * 5)],
      ['Compliance', p.compliance !== 'none' ? 2.5 : 0, o.compliance],
      ['Steady heavy load', p.traffic === 'steady' && s >= 4 ? 1.5 : 0, o.kind === 'container' || o.kind === 'k8s' ? 5 : 3],
      ['Team platform skills', p.teamSize >= 15 ? 1 : 0, o.kind === 'k8s' ? 5 : 3]
    ];
    return { factors: f };
  }

  const SCORERS = { frontend: scoreFrontend, backend: scoreBackend, database: scoreDatabase, hosting: scoreHosting };

  function rankLayer(layer, p) {
    const ranked = [], eliminated = [];
    for (const o of CATALOG[layer]) {
      const r = SCORERS[layer](o, p);
      if (r.eliminated) { eliminated.push({ id: o.id, name: o.name, reason: r.eliminated }); continue; }
      const active = r.factors.filter((x) => x[1] > 0);
      const wsum = active.reduce((a, x) => a + x[1], 0) || 1;
      const score = active.reduce((a, x) => a + x[1] * x[2], 0) / wsum; // 0..5
      const contrib = active.map(([label, w, v]) => ({ label, weight: +w.toFixed(2), value: +v.toFixed(2), points: +((w * v / wsum) * 20).toFixed(1) }))
        .sort((a, b) => b.points - a.points);
      ranked.push({ id: o.id, name: o.name, note: o.note, score: +(score * 20).toFixed(1), contrib, opt: o });
    }
    ranked.sort((a, b) => b.score - a.score);
    return { ranked, eliminated };
  }

  // Cross-layer checks: pick the best combo among top 3 of each layer.
  function compatPenalty(fe, be, db, ho, p) {
    const issues = [];
    let pen = 0;
    if (fe.opt.ssr && fe.id === 'nextjs' && ho.id === 'vercel') pen -= 3; // bonus
    if (be.id === 'baas' && db.id !== 'postgres') { pen += 30; issues.push('Supabase is Postgres underneath'); }
    if (be.id === 'baas' && !['vercel', 'firebase', 'cloudrun', 'render'].includes(ho.id)) { pen += 8; issues.push('BaaS pairs with a light frontend host'); }
    if (!ho.opt.longRunning && (p.realtime) && be.id !== 'baas') { pen += 10; issues.push(ho.name + ' functions are short lived, sockets need a separate service'); }
    if (ho.opt.kind === 'faas' && be.opt.serverless <= 2) { pen += 12; issues.push(be.name + ' has slow cold starts on functions'); }
    if (db.opt.cloud && ho.opt.cloud !== 'any' && db.opt.cloud !== ho.opt.cloud) { pen += 15; issues.push(db.name + ' and ' + ho.name + ' are on different clouds (egress + latency)'); }
    if (db.opt.cloud && ho.opt.cloud === 'any' && ho.id !== 'vercel') { pen += 4; }
    if (fe.id === 'htmx' && be.id === 'baas') { pen += 20; issues.push('HTMX needs a server that renders HTML'); }
    if (fe.opt.ssr && fe.id !== 'htmx' && ho.id === 'firebase' && fe.id === 'nextjs') { pen += 3; }
    if (db.id === 'sqlite' && (ho.opt.serverless || ho.opt.kind === 'faas')) { pen += 40; issues.push('SQLite needs a persistent disk, serverless hosts are ephemeral'); }
    if (fe.lang !== 'any' && be.lang !== 'any' && fe.lang === be.lang) pen -= 2; // one language bonus
    return { pen, issues };
  }

  function estimateCost(ho, db, p) {
    const s = TIERS[p.scale];
    const base = ho.opt.minCost;
    const perTier = { 1: 0, 2: 10, 3: 60, 4: 400, 5: 2500 }[s];
    const dbCost = db.opt.selfHost && ho.id === 'onprem' ? 0 : { 1: 0, 2: 15, 3: 50, 4: 300, 5: 1500 }[s];
    const low = Math.round(base + perTier * 0.6 + dbCost * 0.6);
    const high = Math.round(base + perTier * 1.4 + dbCost * 1.4);
    return { low, high, overBudget: low > p.budget };
  }

  function recommend(raw) {
    const p = normalize(raw);
    const warnings = checkEdgeCases(p);
    const layers = {};
    for (const l of Object.keys(CATALOG)) layers[l] = rankLayer(l, p);
    const empty = Object.keys(layers).filter((l) => !layers[l].ranked.length);
    if (empty.length) {
      return { params: p, warnings: warnings.concat(['No valid option left for: ' + empty.join(', ') + '. Relax a hard constraint (budget, cloud, infra or compliance).']), layers, stack: null };
    }
    let best = null;
    const top = (l) => layers[l].ranked.slice(0, 4);
    for (const fe of top('frontend')) for (const be of top('backend')) for (const db of top('database')) for (const ho of top('hosting')) {
      const c = compatPenalty(fe, be, db, ho, p);
      const total = fe.score * 0.22 + be.score * 0.28 + db.score * 0.25 + ho.score * 0.25 - c.pen * 0.25;
      if (!best || total > best.total) best = { fe, be, db, ho, total, issues: c.issues };
    }
    const cost = estimateCost(best.ho, best.db, p);
    if (cost.overBudget) warnings.push('Estimated run cost $' + cost.low + ' to $' + cost.high + '/mo is above the $' + p.budget + '/mo budget at this scale.');
    const pick = (x, l) => {
      const alt = layers[l].ranked.find((r) => r.id !== x.id);
      return { id: x.id, name: x.name, score: x.score, note: x.note, why: x.contrib.slice(0, 3), all: x.contrib, runnerUp: alt ? { name: alt.name, score: alt.score, gap: +(x.score - alt.score).toFixed(1) } : null };
    };
    const stack = { frontend: pick(best.fe, 'frontend'), backend: pick(best.be, 'backend'), database: pick(best.db, 'database'), hosting: pick(best.ho, 'hosting') };
    const confidence = Math.round(Math.min(99, (best.total) + (stack.backend.runnerUp ? Math.min(10, stack.backend.runnerUp.gap) : 5)));
    const extras = [];
    if (p.realtime) extras.push(best.be.id === 'baas' ? 'Supabase Realtime channels' : 'WebSockets via Socket.IO or a managed layer like Ably');
    if (TIERS[p.scale] >= 3) extras.push('Redis cache (Upstash or ElastiCache) for hot reads and rate limits');
    if (TIERS[p.scale] >= 4) extras.push('CDN in front of static assets and a queue (SQS / Pub/Sub) for async jobs');
    if (p.ml) extras.push('Separate inference worker so model latency does not block API threads');
    if (p.compliance !== 'none') extras.push('Audit logs, encryption at rest, secrets manager, least privilege IAM');
    if (p.mobile && p.seo) extras.push('React Native (Expo) client for the mobile app');
    return { params: p, warnings, stack, compatNotes: best.issues, extras, cost, confidence, layers };
  }

  const API = { recommend, CATALOG, SCALE_LABEL, LANG_NAMES, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.StackSense = API;
})(typeof window !== 'undefined' ? window : globalThis);
