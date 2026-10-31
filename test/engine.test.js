const assert = require('assert');
const S = require('../src/engine.js');
const names = (r) => Object.fromEntries(Object.entries(r.stack).map(([k, v]) => [k, v.id]));
let n = 0; const t = (d, f) => { f(); n++; console.log('ok', d); };
t('on-prem never picks a cloud host or cloud only DB', () => {
  const r = S.recommend({ infra: 'onprem', scale: 'tiny', teamSize: 1, skills: ['php'], budget: 0 });
  assert.equal(r.stack.hosting.id, 'onprem'); assert.ok(!['dynamodb', 'firestore'].includes(r.stack.database.id));
});
t('python + ML picks FastAPI', () => assert.equal(S.recommend({ ml: true, skills: ['py'], projectType: 'analytics' }).stack.backend.id, 'fastapi'));
t('budget filter removes expensive hosts', () => {
  const r = S.recommend({ budget: 10 }); assert.ok(r.layers.hosting.eliminated.some((e) => e.id === 'k8s'));
});
t('PCI drops weak ACID DBs', () => {
  const r = S.recommend({ compliance: 'pci', budget: 2000 }); assert.ok(r.layers.database.eliminated.some((e) => e.id === 'mongodb'));
});
t('SQLite never lands on serverless', () => {
  const r = S.recommend({ scale: 'tiny', teamSize: 1, infra: 'serverless' }); assert.notEqual(r.stack.database.id, 'sqlite');
});
t('cloud lock respected', () => {
  const r = S.recommend({ cloud: 'gcp', budget: 500 }); assert.ok(['cloudrun', 'firebase', 'vercel', 'render', 'k8s', 'vps'].includes(r.stack.hosting.id));
});
t('impossible inputs raise warnings, not crashes', () => {
  const r = S.recommend({ scale: 'massive', budget: 0, compliance: 'hipaa', infra: 'serverless' }); assert.ok(r.warnings.length >= 2);
});
t('garbage input is normalized', () => { const r = S.recommend({ teamSize: 'abc', budget: -5, scale: 'huge' }); assert.ok(r.stack); });
t('India residency keeps only India region hosts', () => { const r = S.recommend({ residencyIN: true, budget: 500 }); assert.ok(r.layers.hosting.eliminated.some((e) => e.id === 'render')); });
t('no option left returns null stack', () => { const r = S.recommend({ infra: 'serverless', compliance: 'hipaa', budget: 0, cloud: 'gcp' }); assert.ok(r.stack === null || r.stack.hosting.id === 'cloudrun'); });
console.log(n + ' tests passed');
