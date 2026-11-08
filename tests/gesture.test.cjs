const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function fixture() {
  const target=()=>({listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},emit(type,event={}){for(const fn of this.listeners[type]??[])fn({preventDefault(){},...event});}});
  const win=target(),doc=target(),button=target(),queue=[],calls=[];
  let focused=true,captured=false;
  doc.hasFocus=()=>focused;doc.hidden=false;
  button.dataset={};
  button.focus=()=>{focused=false;win.emit('blur');focused=true;};
  button.setPointerCapture=()=>{captured=true;};
  button.hasPointerCapture=()=>captured;
  button.releasePointerCapture=id=>{captured=false;button.emit('lostpointercapture',{pointerId:id});};
  vm.runInNewContext(fs.readFileSync(require.resolve('../gesture.js'),'utf8'),{window:win,document:doc,setTimeout:fn=>queue.push(fn)});
  win.bindToggleGesture(button,{begin:()=>0,move:(x,y)=>calls.push(['move',x,y]),end:cancel=>calls.push(['end',cancel]),toggle:()=>calls.push(['toggle']),wake(){},getTravel:()=>200});
  const flush=()=>{while(queue.length)queue.shift()();};
  const down=()=>button.emit('pointerdown',{isPrimary:true,button:0,pointerId:1,clientX:100,clientY:100});
  return {button,win,doc,calls,flush,down,blur(){focused=false;win.emit('blur');}};
}
test('focus changes do not interrupt a captured pointer; pointercancel cancels once',()=>{
  const f=fixture();f.down();f.flush();
  f.win.emit('pointermove',{pointerId:1,clientX:200,clientY:100});
  assert.deepEqual(f.calls,[['move',.5,0]]);
  f.blur();f.flush();assert.deepEqual(f.calls,[['move',.5,0]]);
  f.win.emit('pointercancel',{pointerId:1});
  assert.deepEqual(f.calls,[['move',.5,0],['end',true]]);
});
test('pointer release acts once and suppresses its synthetic click; keyboard remains available',()=>{
  const f=fixture();f.down();f.flush();
  f.win.emit('pointerup',{pointerId:1});
  f.button.emit('click',{detail:1});
  assert.deepEqual(f.calls,[['end',false]]);
  f.button.emit('click',{detail:0});
  assert.deepEqual(f.calls,[['end',false],['toggle']]);
});
test('cancelled pointer releases capture without committing a click',()=>{
  const f=fixture();f.down();f.flush();
  f.win.emit('pointercancel',{pointerId:1});
  f.button.emit('click',{detail:1});
  assert.deepEqual(f.calls,[['end',true]]);
  assert.equal(f.button.hasPointerCapture(1),false);
});
test('visibility notifications do not cancel an active captured drag',()=>{
  const f=fixture();f.down();f.flush();
  f.doc.hidden=true;f.doc.emit('visibilitychange');f.doc.hidden=false;f.doc.emit('visibilitychange');
  assert.deepEqual(f.calls,[]);
  f.win.emit('pointermove',{pointerId:1,pointerType:'mouse',buttons:1,clientX:150,clientY:100});
  assert.deepEqual(f.calls,[['move',.25,0]]);
});
