import './pdf-editor.css';

export function setupPdfEditor({host, grid, cards, split, tool = split ? 'split-pdf' : 'merge-pdf', readOnly = false, rotation, input, parsePages, isBusy, isReady, hasFailed, updateOrder, syncSelection, setSelection, move, openPdf, status}) {
  const history = [];
  const toolbar = document.createElement('div');
  toolbar.className = 'page-toolbar';
  toolbar.hidden = readOnly;
  grid.before(toolbar);
  const summary = document.getElementById('output-summary');
  const process = document.getElementById('process');
  const panel = host.closest('.workpanel');
  panel.classList.add('pdf-editor-panel');
  const orderSummary = document.createElement('details');
  orderSummary.className = 'page-order-summary';
  const orderTitle = document.createElement('summary');
  const orderText = document.createElement('p');
  orderSummary.append(orderTitle, orderText);
  orderSummary.hidden = readOnly;
  grid.after(orderSummary);
  const buttons = [];
  function button(label, action) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'secondary'; el.textContent = label;
    el.onclick = () => { if (isReady() && !isBusy()) action(); };
    toolbar.append(el); buttons.push(el); return el;
  }
  function remember() {
    if (!isReady() || isBusy()) return;
    history.push({order:[...cards], value:input?.value});
    if (history.length > 50) history.shift();
  }
  if (split) {
    for (const [label, mode] of [['Select all','all'],['Deselect all','none'],['Invert selection','invert']]) {
      button(label, () => {
        remember();
        cards.forEach(c => c.checkbox.checked = mode === 'all' || (mode === 'invert' && !c.checkbox.checked));
        setSelection(); refresh();
      });
    }
  }
  const undo = button('↶ Undo', () => {
    const previous = history.pop();
    if (!previous) return;
    cards.splice(0, cards.length, ...previous.order);
    if (input) { input.value = previous.value; syncSelection(true); }
    updateOrder(); refresh(); status.textContent = 'Previous change restored.';
  });
  const reset = button('Reset order', () => {
    remember(); cards.sort((a,b) => a.original-b.original);
    if (input) setSelection();
    updateOrder(); refresh(); status.textContent = 'Original page order restored. Selection kept.';
  });
  const beforeInput = () => remember();
  input?.addEventListener('beforeinput', beforeInput);
  function refresh() {
    const ready = isReady(), busy = isBusy();
    buttons.forEach(b => b.disabled = !ready || busy);
    undo.disabled = !ready || busy || !history.length;
    reset.disabled = !ready || busy || cards.every((c,i) => c.original === i);
    let selected = cards, error = '';
    if (split) {
      try { selected = input.value.trim() ? parsePages(input.value, cards.length).map(i => cards.find(c => c.index === i)) : []; }
      catch { selected = []; error = 'Check the page range'; }
    }
    const count = selected.length;
    summary.hidden = false;
    summary.textContent = hasFailed() ? 'Remove the PDF that could not be opened.' : !ready ? 'Loading page previews…' : error || `${count} ${count === 1 ? 'page' : 'pages'} ${split ? 'selected' : readOnly ? 'to compress' : 'to merge'}`;
    const labels = selected.filter(Boolean).map(c => split ? `${c.index+1}` : `F${c.fileIndex+1}:P${c.index+1}`);
    orderTitle.textContent = `Output order: ${labels.slice(0, 8).join(', ') || 'No pages selected'}${labels.length > 8 ? '… (show all)' : ''}`;
    orderText.textContent = labels.join(' → ') || 'Select at least one page.';
    process.disabled = busy || !ready || !count || (tool === 'merge-pdf' && new Set(cards.map(c=>c.file)).size < 2);
    cards.forEach((c, i) => {
      c.earlier.disabled = !ready || busy || i === 0;
      c.later.disabled = !ready || busy || i === cards.length-1;
      const angle = Number(rotation?.value || 0);
      const image = c.zoom.querySelector('img');
      if (image) image.style.transform = `rotate(${angle}deg) scale(${angle % 180 ? 0.7 : 1})`;
      c.zoom.disabled = !ready || busy;
      c.position.disabled = !ready || busy;
      c.grip.disabled = !ready || busy;
      if (c.checkbox) c.checkbox.disabled = !ready || busy;
    });
  }
  window.addEventListener('mydocpro:processing', refresh);
  rotation?.addEventListener('change', refresh);

  // Render only the requested page at reading resolution; release it on close.
  const dialog = document.createElement('dialog');
  dialog.className = 'page-zoom-dialog';
  dialog.innerHTML = '<div class="zoom-heading"><h2 id="page-zoom-title"></h2><button type="button" class="secondary">Close</button></div><div class="zoom-content" role="status"></div>';
  dialog.setAttribute('aria-labelledby','page-zoom-title');
  document.body.append(dialog);
  const close = dialog.querySelector('button');
  close.onclick = () => dialog.close();
  dialog.onclick = e => { if (e.target === dialog) dialog.close(); };
  let generation = 0, task = null, zoomDoc = null, opener;
  function release() {
    generation++; task?.cancel(); task = null;
    const old = zoomDoc; zoomDoc = null;
    if (old) void old.destroy();
    dialog.querySelector('.zoom-content').replaceChildren();
  }
  dialog.onclose = () => { release(); if (opener?.isConnected) opener.focus(); };
  async function zoom(entry) {
    if (!isReady() || isBusy()) return;
    release(); const token = generation;
    opener = entry.zoom;
    dialog.querySelector('h2').textContent = `${entry.file.name} · Page ${entry.index+1}`;
    const content = dialog.querySelector('.zoom-content');
    content.textContent = 'Loading page…'; dialog.showModal(); close.focus();
    try {
      const doc = await openPdf(entry.file);
      if (token !== generation) { await doc.destroy(); return; }
      zoomDoc = doc;
      const page = await doc.getPage(entry.index+1);
      if (token !== generation) return;
      const angle = (page.rotate + Number(rotation?.value || 0)) % 360;
      const natural = page.getViewport({scale:1, rotation:angle});
      const view = page.getViewport({scale:Math.min(1600/natural.width,2200/natural.height), rotation:angle});
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
      canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',`Page ${entry.index+1} preview`);
      task = page.render({canvasContext:canvas.getContext('2d'),viewport:view,background:'#fff'});
      await task.promise;
      if (token !== generation) return;
      task = null; content.replaceChildren(canvas); page.cleanup();
    } catch { if (token === generation) content.textContent = 'Could not render this page. Close and try again.'; }
  }

  const moveDialog = document.createElement('dialog');
  moveDialog.className = 'page-move-dialog';
  moveDialog.innerHTML = '<form><h2>Move page</h2><label>New position<input type="number" min="1" step="1" required></label><div><button type="button" class="secondary">Cancel</button><button type="submit" class="primary">Move</button></div></form>';
  moveDialog.setAttribute('aria-label','Move page to position');
  document.body.append(moveDialog);
  let moving;
  const positionInput = moveDialog.querySelector('input');
  moveDialog.querySelector('[type=button]').onclick = () => moveDialog.close();
  moveDialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    if (!isReady() || isBusy()) return;
    move(moving, Number(positionInput.value)-1-cards.indexOf(moving), false);
    moveDialog.close();
  };
  moveDialog.onclose = () => { if (moving?.position.isConnected) moving.position.focus(); };
  function moveTo(entry) {
    if (!isReady() || isBusy()) return;
    moving = entry; positionInput.max = cards.length; positionInput.value = cards.indexOf(entry)+1;
    moveDialog.showModal(); positionInput.focus(); positionInput.select();
  }
  return {remember, refresh, zoom, moveTo, dispose() {
    input?.removeEventListener('beforeinput', beforeInput);
    window.removeEventListener('mydocpro:processing', refresh);
    rotation?.removeEventListener('change', refresh);
    if (dialog.open) dialog.close(); release(); dialog.remove(); moveDialog.remove();
    panel.classList.remove('pdf-editor-panel');
    summary.hidden = true; process.disabled = false;
  }};
}
