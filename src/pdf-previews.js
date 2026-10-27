import './pdf-previews.css';
// Each view owns its render task, PDF documents and object URLs.
// Replacing/removing files or leaving the tool disposes the previous view.
let disposeCurrent = () => {};
export function clearPdfPreviews() { disposeCurrent(); disposeCurrent = () => {}; }

export function showPdfPreviews(host, files, {split, openPdf, parsePages, isBusy}) {
  clearPdfPreviews();
  host.replaceChildren();
  if (!files.length) return;
  let disposed = false, renderTask, pageCount = 0;
  const urls = [], cards = [];
  const input = split ? document.getElementById('pages') : null;
  const heading = document.createElement('h2');
  heading.textContent = split ? 'Choose your pages' : 'Preview merge order';
  const help = document.createElement('p');
  help.className = 'preview-help';
  help.textContent = split ? 'Select thumbnails or enter a page range below.' : 'Files are merged in the order above. Use the arrows to change their order.';
  const status = document.createElement('p');
  status.className = 'preview-help';
  status.setAttribute('role', 'status');
  host.append(heading, help, status);

  function syncSelection() {
    if (!input || disposed) return;
    let selected = new Set();
    try { selected = new Set(parsePages(input.value, pageCount)); } catch { /* Invalid ranges stay editable. */ }
    for (const {checkbox, index} of cards) checkbox.checked = selected.has(index);
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
      const grid = document.createElement('div');
      grid.className = 'page-thumbnails';
      group.append(title, grid);
      host.append(group);
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
          const card = document.createElement(split ? 'label' : 'figure');
          card.className = 'page-thumbnail';
          const caption = document.createElement('span');
          caption.className = 'page-caption';
          if (split) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('aria-label', `Select page ${n}`);
            checkbox.onchange = () => {
              if (isBusy()) { syncSelection(); return; }
              let selected;
              try { selected = new Set(parsePages(input.value, pageCount)); } catch { selected = new Set(); }
              if (checkbox.checked) selected.add(n - 1); else selected.delete(n - 1);
              input.value = [...selected].sort((a,b) => a-b).map(i => i+1).join(', ');
              input.dispatchEvent(new Event('input', {bubbles:true}));
            };
            caption.append(checkbox);
            cards.push({checkbox, index:n-1});
          }
          caption.append(`Page ${n}`);
          const placeholder = document.createElement('div');
          placeholder.className = 'thumbnail-image';
          placeholder.textContent = 'Loading preview…';
          card.append(placeholder, caption);
          grid.append(card);
        }
        syncSelection();
        // Render one small page at a time instead of retaining full-size canvases.
        for (let n = 1; n <= doc.numPages; n++) {
          if (disposed) return;
          const placeholder = grid.children[n-1].querySelector('.thumbnail-image');
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
        const message = document.createElement('p');
        message.className = 'notice';
        message.textContent = `Could not preview ${file.name}: ${error.message || 'Invalid or protected PDF.'}`;
        group.append(message);
      } finally {
        if (doc) await doc.destroy();
      }
    }
    if (!disposed) {
      if (split) syncSelection();
      else status.textContent = `${total} pages across ${files.length} PDFs`;
    }
  }
  void render();
}
