import './pdf-previews.css';
// Each view owns its render task, PDF documents and object URLs.
// Replacing/removing files or leaving the tool disposes the previous view.
let disposeCurrent = () => {};
let mergeOrder = null;
export function getMergePageOrder() {
  if (!mergeOrder) throw Error('Wait for all page previews to load before merging.');
  return mergeOrder.map(({file, index}) => ({file, index}));
}
export function clearPdfPreviews() { disposeCurrent(); disposeCurrent = () => {}; mergeOrder = null; }

export function showPdfPreviews(host, files, {split, openPdf, parsePages, isBusy}) {
  clearPdfPreviews();
  host.replaceChildren();
  if (!files.length) return;
  let disposed = false, renderTask, pageCount = 0, ready = false, failed = false;
  const urls = [], cards = [];
  const input = split ? document.getElementById('pages') : null;
  const heading = document.createElement('h2');
  heading.textContent = split ? 'Choose your pages' : 'Preview merge order';
  const help = document.createElement('p');
  help.className = 'preview-help';
  help.textContent = 'Use Earlier and Later to change page positions. ' + (split ? 'Select the pages to extract; the range below shows their output order.' : 'Pages can move between files. Changing the file list resets the page order.');
  const status = document.createElement('p');
  status.className = 'preview-help';
  status.setAttribute('role', 'status');
  host.append(heading, help, status);
  const grid = document.createElement('div');
  grid.className = 'page-thumbnails';
  host.append(grid);
  function updateOrder() {
    cards.forEach((entry, i) => {
      grid.append(entry.card);
      entry.position.textContent = `Position ${i+1}`;
      entry.earlier.disabled = !ready || i === 0;
      entry.later.disabled = !ready || i === cards.length-1;
    });
    if (!split && ready && !failed) mergeOrder = cards;
  }
  function move(entry, offset) {
    if (!ready || isBusy()) return;
    const i = cards.indexOf(entry), next = i+offset;
    if (next < 0 || next >= cards.length) return;
    [cards[i],cards[next]] = [cards[next],cards[i]];
    updateOrder();
    if (input) {
      input.value = cards.filter(c => c.checkbox.checked).map(c => c.index+1).join(', ');
      input.dispatchEvent(new Event('input', {bubbles:true}));
    }
    status.textContent = `Moved page ${entry.index+1} to position ${next+1}.`;
    (offset<0 ? entry.earlier : entry.later).focus();
  }

  function syncSelection() {
    if (!input || disposed) return;
    let selected = new Set();
    try { selected = new Set(parsePages(input.value, pageCount)); } catch { /* Invalid ranges stay editable. */ }
    for (const {checkbox, index} of cards) checkbox.checked = selected.has(index);
    if (selected.size) {
      const rank = new Map([...selected].map((index,i)=>[index,i]));
      cards.sort((a,b)=>(rank.get(a.index)??Infinity)-(rank.get(b.index)??Infinity));
      updateOrder();
    }
    status.textContent = `${selected.size} of ${pageCount} pages selected`;
  }
  input?.addEventListener('input', syncSelection);
  disposeCurrent = () => {
    disposed = true;
    renderTask?.cancel();
    input?.removeEventListener('input', syncSelection);
    urls.forEach(URL.revokeObjectURL);
  };

  async function render() {
    let total = 0;
    for (const [fileIndex, file] of files.entries()) {
      if (disposed) return;
      const group = document.createElement('section');
      group.className = 'preview-group';
      const title = document.createElement('h3');
      title.textContent = `${fileIndex + 1}. ${file.name}`;
      group.append(title);
      host.insertBefore(group, grid);
      const fileCards = [];
      let doc;
      try {
        status.textContent = `Loading ${file.name}…`;
        doc = await openPdf(file);
        if (disposed) return;
        total += doc.numPages;
        if (total > 300) throw Error('Preview limit is 300 pages in total. Remove a PDF to continue.');
        pageCount = doc.numPages;
        title.textContent += ` · ${doc.numPages} ${doc.numPages === 1 ? 'page' : 'pages'}`;
        for (let n = 1; n <= doc.numPages; n++) {
          const card = document.createElement('figure');
          card.className = 'page-thumbnail';
          const caption = document.createElement(split ? 'label' : 'span');
          caption.className = 'page-caption';
          const entry = {card, file, index:n-1};
          if (split) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('aria-label', `Select page ${n}`);
            checkbox.onchange = () => {
              if (isBusy()) { syncSelection(); return; }
              let selected;
              try { selected = new Set(parsePages(input.value, pageCount)); } catch { selected = new Set(); }
              if (checkbox.checked) selected.add(n - 1); else selected.delete(n - 1);
              input.value = cards.filter(c => selected.has(c.index)).map(c => c.index+1).join(', ');
              input.dispatchEvent(new Event('input', {bubbles:true}));
            };
            caption.append(checkbox);
            entry.checkbox = checkbox;
          }
          caption.append(`Page ${n}`);
          const placeholder = document.createElement('div');
          placeholder.className = 'thumbnail-image';
          placeholder.textContent = 'Loading preview…';
          card.append(placeholder, caption);
          const source = document.createElement('small');
          source.className = 'page-source';
          source.textContent = file.name;
          const position = document.createElement('small');
          const controls = document.createElement('div');
          controls.className = 'page-move-controls';
          for (const [key, text, offset] of [['earlier','Earlier',-1],['later','Later',1]]) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'secondary';
            button.textContent = `${offset<0?'←':'→'} ${text}`;
            button.setAttribute('aria-label', `Move ${file.name} page ${n} ${text.toLowerCase()}`);
            button.disabled = true;
            button.onclick = () => move(entry, offset);
            entry[key] = button; controls.append(button);
          }
          entry.position = position;
          cards.push(entry); fileCards.push(entry);
          card.append(source, position, controls);
          grid.append(card);
        }
        syncSelection();
        // Render one small page at a time instead of retaining full-size canvases.
        for (let n = 1; n <= doc.numPages; n++) {
          if (disposed) return;
          const placeholder = fileCards[n-1].card.querySelector('.thumbnail-image');
          const page = await doc.getPage(n);
          if (disposed) return;
          const natural = page.getViewport({scale:1});
          const viewport = page.getViewport({scale:Math.min(300/natural.width, 360/natural.height)});
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.ceil(viewport.width));
          canvas.height = Math.max(1, Math.ceil(viewport.height));
          try {
            renderTask = page.render({canvasContext:canvas.getContext('2d'), viewport, background:'#ffffff'});
            await renderTask.promise;
            renderTask = null;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
            if (disposed) return;
            if (!blob) throw Error('Could not create thumbnail.');
            const url = URL.createObjectURL(blob);
            urls.push(url);
            const image = document.createElement('img');
            image.src = url;
            image.alt = `${file.name}, page ${n}`;
            placeholder.replaceChildren(image);
          } catch (error) {
            if (disposed) return;
            placeholder.textContent = 'Preview unavailable';
          } finally {
            canvas.width = canvas.height = 1;
            page.cleanup();
          }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (error) {
        if (disposed) return;
        failed = true;
        const message = document.createElement('p');
        message.className = 'notice';
        message.textContent = `Could not preview ${file.name}: ${error.message || 'Invalid or protected PDF.'}`;
        group.append(message);
      } finally {
        if (doc) await doc.destroy();
      }
    }
    if (!disposed) {
      ready = true;
      updateOrder();
      if (split) syncSelection();
      else status.textContent = `${total} pages across ${files.length} PDFs`;
    }
  }
  void render();
}
