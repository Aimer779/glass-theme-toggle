/* Normalized gesture physics; rendering and pointer events stay outside this module. */
(function (root) {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function rubber(value, min, max, strength = .24, limit = .16) {
    const edge = clamp(value, min, max), distance = value-edge;
    return edge + Math.sign(distance)*limit*(1-Math.exp(-Math.abs(distance)*strength/limit));
  }
  function spring(body, goal, stiffness, damping, dt) {
    body.v += ((goal-body.p)*stiffness-body.v*damping)*dt;
    body.p += body.v*dt;
  }
  function createMotion(config) {
    let settings = config;
    const b = { x:{p:0,v:0}, y:{p:0,v:0}, sx:{p:1,v:0}, sy:{p:1,v:0}, phase:{p:50,v:0} };
    let mode = 'idle', target = 0, committed = 0, returnTarget = 0;
    let goalX = 0, goalY = 0, rawX = 0, route = { night:50, day:0 };
    function newRoute() {
      // Fresh transitions take the observed counter-clockwise half-turn.
      // An interruption keeps this branch, so a reversal retraces the same side.
      const anchor = b.phase.p;
      route = committed ? { night:anchor-50, day:anchor } : { night:anchor, day:anchor-50 };
    }
    function to(next) {
      if (mode === 'idle') newRoute();
      target = next; goalX = next; goalY = 0; mode = 'settling';
    }
    function begin() {
      if (mode === 'idle') newRoute();
      returnTarget = committed; goalX = rawX = b.x.p; goalY = b.y.p;
      mode = 'pressed';
    }
    function drag(x, y) {
      mode = 'dragging'; rawX = x;
      goalX = rubber(x,0,1,settings.elasticity);
      goalY = rubber(y,0,0,.18,.065);
    }
    function release(cancel = false) {
      const tap = mode === 'pressed';
      if (cancel) { b.x.v = 0; to(returnTarget); return; }
      if (tap) { to(1-target); return; }
      // A projection preserves a flick's direction; held drags have zero velocity.
      to(rawX <= 0 ? 0 : rawX >= 1 ? 1 : Number(b.x.p+b.x.v*.12 >= .5));
    }
    function snap() {
      b.x = {p:target,v:0}; b.y = {p:0,v:0};
      b.sx = {p:1,v:0}; b.sy = {p:1,v:0};
      b.phase = {p:target ? route.day : route.night,v:0};
      mode = 'idle'; committed = target;
    }
    function step(seconds, reduced = false) {
      if (mode === 'idle' || mode === 'paused') return;
      const held = mode === 'pressed' || mode === 'dragging';
      if (reduced) {
        if (!held) { snap(); return; }
        b.x = {p:goalX,v:0}; b.y = {p:0,v:0}; b.sx = {p:1,v:0}; b.sy = {p:1,v:0};
        b.phase = {p:route.night+(route.day-route.night)*clamp(goalX,0,1),v:0};
        return;
      }
      const dt = Math.min(Math.max(seconds,0),.1);
      const n = Math.max(1,Math.ceil(dt*240)), h = dt/n;
      for (let i=0; i<n; i++) {
        spring(b.x,goalX,held ? 720 : settings.stiffness,held ? 42 : settings.damping,h);
        spring(b.y,goalY,260,24,h);
        const over = Math.abs(goalX-clamp(goalX,0,1));
        // Sustained pressure contracts the shell. Stretch is transient and
        // follows speed; a stationary midpoint must not remain flattened.
        const stretch = settings.deformation*(Math.min(Math.abs(b.x.v),6)*.035-over*.35);
        const sx = clamp(1-(held?.02*settings.deformation:0)+stretch,.84,1.24);
        spring(b.sx,sx,280,18,h);
        spring(b.sy,clamp(1-(held?.05*settings.deformation:0)-stretch*.45,.84,1.12),280,18,h);
        const p = held ? clamp(b.x.p,0,1) : target;
        const k = 6/(settings.rimLag/1000)**2;
        spring(b.phase,route.night+(route.day-route.night)*p,k,2.1*Math.sqrt(k),h);
      }
      if (!held) {
        const goals = {x:target,y:0,sx:1,sy:1,phase:target ? route.day : route.night};
        const resting = Object.keys(b).every(key => Math.abs(b[key].p-goals[key]) < (key==='phase' ? .02 : .0003) && Math.abs(b[key].v) < (key==='phase' ? .12 : .003));
        if (resting) snap();
      }
    }
    function snapshot() {
      return { x:b.x.p,y:b.y.p,sx:b.sx.p,sy:b.sy.p,phase:b.phase.p,vx:b.x.v, mode,target,committed, route:{...route}, bodies:Object.fromEntries(Object.entries(b).map(([key,value]) => [key,{...value}])) };
    }
    function restore(frame) {
      for (const key of Object.keys(b)) b[key] = {...frame.bodies[key]};
      route = {...frame.route}; target = frame.target; committed = frame.committed;
      mode = 'paused';
    }
    function replay(next = target) {
      target = committed = 1-next;
      b.x = {p:committed,v:0}; b.y = {p:0,v:0}; b.sx = {p:1,v:0}; b.sy = {p:1,v:0};
      b.phase = {p:committed ? 0 : 50,v:0}; mode = 'idle'; to(next);
    }
    return { begin,drag,release,to,step,snapshot,restore,replay,snap,
      toggle() { to(1-target); },
      resume() { to(target); },
      configure(next) { settings = next; },
    };
  }
  const api = { rubber, createMotion };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ToggleMotion = api;
})(globalThis);
