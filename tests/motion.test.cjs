const {test} = require('node:test');
const assert = require('node:assert/strict');
const {rubber,createMotion} = require('../motion.js');
const config = {stiffness:220,damping:20,elasticity:.25,deformation:1,rimLag:230};
function advance(engine,seconds) { for (let i=0;i<Math.ceil(seconds*120);i++) engine.step(1/120); return engine.snapshot(); }
function settle(engine) { const f=advance(engine,6); assert.equal(f.mode,'idle'); return f; }
test('rubber-band boundaries are continuous, resist motion and limit overdrag',() => {
  assert.equal(rubber(0,0,1),0); assert.equal(rubber(1,0,1),1);
  let previous=1;
  for (const raw of [1.001,1.1,2,10,1000]) {
    const x=rubber(raw,0,1); assert.ok(x>=previous && x<=1.16 && x<raw); previous=x;
  }
  assert.ok(rubber(-1000,0,1)>=-.16);
  assert.equal(rubber(.5,0,1),.5);
});
test('middle drag remains continuous and deformed while held, then retraces the highlight',() => {
  const e=createMotion(config); e.begin(); e.drag(.5,0);
  let f=advance(e,2);
  assert.equal(f.mode,'dragging'); assert.ok(Math.abs(f.x-.5)<.001);
  assert.ok(Math.abs(f.sx-.98)<.002 && Math.abs(f.sy-.95)<.002); assert.ok(Math.abs(f.phase-25)<.05);
  e.drag(.2,0); f=advance(e,2);
  assert.ok(Math.abs(f.x-.2)<.001); assert.ok(f.phase>39);
  e.release(); f=settle(e); assert.equal(f.x,0); assert.equal(f.phase,50);
});
test('fresh toggles use the observed sides, interrupted toggles preserve phase and velocity',() => {
  const e=createMotion(config); e.toggle(); const a=advance(e,.12);
  assert.ok(a.phase<50 && a.phase>0); assert.ok(a.vx>0);
  e.toggle(); const b=e.snapshot();
  assert.equal(a.x,b.x); assert.equal(a.phase,b.phase); assert.equal(a.vx,b.vx);
  assert.equal(settle(e).phase,50);
  e.toggle(); assert.equal(settle(e).phase,0);
  e.toggle(); const c=advance(e,.12); assert.ok(c.phase<0 && c.phase> -50);
  assert.equal(settle(e).phase,-50);
});
test('overdrag at both ends returns to a legal endpoint and clears deformation',() => {
  for (const x of [-5,5]) {
    const e=createMotion(config); e.begin(); e.drag(x,.8); let f=advance(e,2);
    assert.ok(f.x>=-.16 && f.x<=1.16); assert.ok(f.y>0 && f.y<=.065);
    assert.ok(f.sx<1); e.release(); f=settle(e);
    assert.equal(f.x,x<0?0:1); assert.equal(f.sx,1); assert.equal(f.sy,1); assert.equal(f.y,0);
  }
});
test('cancellation returns to the last committed state, without a click toggle',() => {
  const e=createMotion(config); e.toggle(); settle(e); e.begin(); e.drag(.15,0); advance(e,.2);
  e.release(true); assert.equal(settle(e).target,1);
});
test('spring response overshoots and then rests for permitted parameter extremes',() => {
  for (const stiffness of [80,500]) for (const damping of [8,45]) {
    const e=createMotion({...config,stiffness,damping}); e.toggle();
    let peak=0;
    for(let i=0;i<1200;i++) {e.step(1/120); const f=e.snapshot(); peak=Math.max(peak,f.x); assert.ok(Number.isFinite(f.sx));}
    assert.equal(e.snapshot().mode,'idle');
    if(damping===8) assert.ok(peak>1.02);
  }
});
test('recorded states freeze and reduced motion settles without time animation',() => {
  const e=createMotion(config); e.toggle(); const f=advance(e,.15); e.restore(f);
  advance(e,1); assert.equal(e.snapshot().x,f.x); assert.equal(e.snapshot().phase,f.phase);
  e.resume(); e.step(1/60,true); assert.equal(e.snapshot().x,1); assert.equal(e.snapshot().sx,1);
  e.begin(); e.drag(.5,0); e.step(1/60,true); assert.equal(e.snapshot().x,.5); assert.equal(e.snapshot().sx,1);
});
