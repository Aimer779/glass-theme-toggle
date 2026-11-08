window.bindToggleGesture = function (button, { begin, move, end, toggle, wake, getTravel }) {
  let pointer = null, suppressClick = false;
  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    const origin = begin();
    pointer = { id:event.pointerId, x:event.clientX, y:event.clientY, origin, moved:false };
    suppressClick = false;
    button.dataset.pointerFocus = 'true';
    // Keep the browser's native drag/selection gesture from taking capture.
    event.preventDefault();
    button.focus({preventScroll:true});
    button.setPointerCapture(event.pointerId); wake();
  });
  window.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX-pointer.x, dy = event.clientY-pointer.y;
    if (Math.hypot(dx,dy)>4) pointer.moved = true;
    if (pointer.moved) move(pointer.origin+dx/getTravel(),dy/getTravel());
    wake();
  });
  function finish(event, cancelled) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const id = pointer.id; pointer = null;
    suppressClick = true;
    end(cancelled); wake();
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
  }
  window.addEventListener('pointerup', e => finish(e,false));
  window.addEventListener('pointercancel', e => finish(e,true));
  button.addEventListener('lostpointercapture', e => finish(e,true));
  button.addEventListener('dragstart',event => event.preventDefault());
  button.addEventListener('click', event => {
    // Native keyboard activation has detail=0. Pointer release already acted.
    if (event.detail === 0 || !suppressClick) toggle();
    suppressClick = false;
  });
  button.addEventListener('keydown', event => {
    delete button.dataset.pointerFocus;
    if (event.key === 'Escape' && pointer) finish({pointerId:pointer.id},true);
  });
  const cancel = () => { if (pointer) finish({pointerId:pointer.id},true); };
  // Keep lifecycle decisions on the captured pointer. Embedded browsers can
  // report focus/visibility changes even while the pointer is still active.
  return { cancel };
};
