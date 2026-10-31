#!/usr/bin/env node
// Usage: node src/cli.js '{"scale":"large","skills":["go"],"budget":800,"realtime":true}'
const S = require('./engine.js');
const r = S.recommend(JSON.parse(process.argv[2] || '{}'));
if (r.warnings.length) console.log('Warnings:\n- ' + r.warnings.join('\n- '));
if (!r.stack) { console.log('No valid stack. Relax a hard constraint.'); process.exit(1); }
for (const [l, x] of Object.entries(r.stack)) {
  console.log(`\n${l.toUpperCase()}: ${x.name} (${x.score}/100)`);
  x.why.forEach((c) => console.log(`  + ${c.label}: ${c.points} pts`));
  if (x.runnerUp) console.log(`  runner up: ${x.runnerUp.name} (${x.runnerUp.score})`);
}
console.log(`\nCost: $${r.cost.low} to $${r.cost.high}/mo, fit ${r.confidence}/100`);
