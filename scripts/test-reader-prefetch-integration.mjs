import assert from 'node:assert/strict';
import { AnalyzerPriorityScheduler } from '../src/lib/analyzerPriorityScheduler.js';
import { planRollingTextScenePrefetch } from '../src/lib/scenePrefetch.js';

const scene = text => ({ type: 'scene', data: { plainText: text } });
const image = () => ({ type: 'illustration', data: {} });
const items = [scene('s0'), image(), ...Array.from({ length: 30 }, (_, index) => scene(`s${index + 1}`))];

function identities(plan) {
  return plan.ordered.map(target => `id:${target.text}`);
}

// Opening at s1 establishes the exact B.1 priority order.
const openPlan = planRollingTextScenePrefetch(items, 2);
assert.deepEqual(openPlan.ordered.map(target => target.text), [
  's2','s3','s4','s5','s6','s0','s7','s8','s9','s10','s11'
]);

// Moving one text scene forward keeps the rolling overlap and adds only s12.
const nextPlan = planRollingTextScenePrefetch(items, 3);
const oldForward = new Set(openPlan.forward.map(target => target.text));
const newlyAdded = nextPlan.forward.filter(target => !oldForward.has(target.text));
assert.deepEqual(newlyAdded.map(target => target.text), ['s12']);
assert.equal(nextPlan.previous.text, 's1');
assert.equal(nextPlan.ordered[5].priorityClass, 'previous-protection');

// Moving backward protects and reuses the previous area.
const backPlan = planRollingTextScenePrefetch(items, 2);
assert.equal(backPlan.forward[0].text, 's2');
assert.equal(backPlan.previous.text, 's0');

// A distant jump replaces queued old speculation but never interrupts active work.
const starts = [];
const controls = [];
const scheduler = new AnalyzerPriorityScheduler(text => new Promise(resolve => {
  starts.push(text);
  controls.push({ text, resolve });
}));
const active = scheduler.schedule({ identity:'id:s2', text:'s2', priority:1, kind:'prefetch', planId:'near' });
const oldPromises = openPlan.ordered.slice(1).map(target => {
  const promise = scheduler.schedule({
    identity:`id:${target.text}`, text:target.text,
    priority:target.queuePriority, kind:'prefetch', planId:'near'
  });
  promise.catch(() => {});
  return promise;
});
const jumpPlan = planRollingTextScenePrefetch(items, 20);
scheduler.replaceSpeculativePlan('jump', identities(jumpPlan));
const visible = scheduler.schedule({ identity:'id:s19', text:'s19', priority:0, kind:'foreground', planId:'jump' });
assert.deepEqual(starts, ['s2']);
assert.equal(scheduler.snapshot().activeCount, 1);
assert.ok(scheduler.snapshot().staleRemoved > 0);
controls.shift().resolve('s2-ready');
assert.equal(await active, 's2-ready');
await Promise.resolve();
assert.deepEqual(starts, ['s2','s19']);
controls.shift().resolve('s19-ready');
assert.equal(await visible, 's19-ready');

// A queued target becoming visible is coalesced and promoted, not duplicated.
const promotionStarts=[];
const promotionControls=[];
const promotionScheduler=new AnalyzerPriorityScheduler(text=>new Promise(resolve=>{
  promotionStarts.push(text); promotionControls.push({text,resolve});
}));
const blocker=promotionScheduler.schedule({identity:'blocker',text:'blocker',priority:1,kind:'prefetch',planId:'p'});
const queued=promotionScheduler.schedule({identity:'id:s5',text:'s5',priority:5,kind:'prefetch',planId:'p'});
const promoted=promotionScheduler.schedule({identity:'id:s5',text:'s5',priority:0,kind:'foreground',planId:'p2'});
assert.equal(queued,promoted);
assert.equal(promotionScheduler.snapshot().promoted,1);
promotionControls.shift().resolve('blocker-ready'); await blocker; await Promise.resolve();
assert.deepEqual(promotionStarts,['blocker','s5']);
promotionControls.shift().resolve('s5-ready'); assert.equal(await promoted,'s5-ready');

// Session close removes queued work and leaves at most the active request.
const closeScheduler=new AnalyzerPriorityScheduler(text=>new Promise(resolve=>controls.push({text,resolve})));
const closeActive=closeScheduler.schedule({identity:'active-close',text:'active-close',priority:1,kind:'prefetch',planId:'p'});
const closeQueued=closeScheduler.schedule({identity:'queued-close',text:'queued-close',priority:2,kind:'prefetch',planId:'p'});
closeQueued.catch(()=>{});
closeScheduler.clear();
assert.equal(closeScheduler.snapshot().queuedCount,0);
assert.equal(closeScheduler.snapshot().activeCount,1);
controls.shift().resolve('closed-active-finished');
assert.equal(await closeActive,'closed-active-finished');

await Promise.allSettled(oldPromises);
console.log('Reader rolling-window integration qualification tests passed');
