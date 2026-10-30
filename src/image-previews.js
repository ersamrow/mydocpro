import {attachImageManipulator} from './image-manipulator.js';
let dispose = () => {};
export function clearImagePreviews() { dispose(); dispose = () => {}; }
export function showImagePreviews(host, files, {render, isBusy, sourceOnly = false, compression = false, kind = ''}) {
  clearImagePreviews(); host.replaceChildren();host.classList.remove('crop-editor-layout');
  if (!files.length) return;
  let dead = false, revision = 0, timer, running = false, pending = false, resultUrl;
  const urls = [];
  const title = document.createElement('h2'); title.textContent = ['crop-image','resize-image'].includes(kind) ? 'Result preview' : 'Image preview';
  const sources = document.createElement('div'); sources.className = 'image-originals';
  for (const file of files) {
    const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
    image.src = URL.createObjectURL(file); urls.push(image.src); image.alt = `Original: ${file.name}`;
    caption.textContent = file.name; figure.append(image, caption); sources.append(figure);
  }
  const original = document.createElement('details'); original.open = sourceOnly;
  const label = document.createElement('summary'); label.textContent = sourceOnly ? 'Images in output order' : 'Show original image'+(files.length > 1 ? 's' : '');
  original.append(label, sources);
  const stage = document.createElement('div'); stage.className = 'image-edit-stage';
  const initial = document.createElement('img'); initial.src = urls[0]; initial.alt = 'Original image while preview loads'; stage.append(initial);
  const note = document.createElement('p'); note.className = 'image-preview-note'; note.setAttribute('role','status');
  const result=document.createElement('section');result.className='image-result-panel';
  result.append(title,original);
  if (!sourceOnly) result.append(stage,note);
  host.append(result);
  if(kind==='crop-image')host.classList.add('crop-editor-layout');
  const settings = host.parentElement.querySelector('.settings');
  async function update() {
    if (dead || sourceOnly) return;
    if (running || isBusy()) { pending = true; return; }
    pending = false; running = true; const current = revision;
    note.textContent = 'Updating preview…'; stage.setAttribute('aria-busy','true');
    try {
      const blob = await render();
      if (dead || current !== revision) return;
      const image = document.createElement('img');
      const url = URL.createObjectURL(blob); urls.push(url); image.src = url;
      image.alt = 'Preview with current editing settings'; await image.decode();
      if (dead || current !== revision) { URL.revokeObjectURL(url); return; }
      if (resultUrl) URL.revokeObjectURL(resultUrl); resultUrl = url;
      stage.replaceChildren(image);
      note.textContent = `${image.naturalWidth} × ${image.naturalHeight} px · ${compression ? 'Layout preview; compression is applied when you process.' : 'Preview updates as you edit.'}`;
    } catch (error) {
      if (!dead && current === revision) {
        stage.replaceChildren(); original.open = true;
        note.textContent = error.message || 'Unable to preview this image.';
      }
    } finally {
      running = false; stage.removeAttribute('aria-busy');
      if (!dead && (pending || current !== revision)) { pending = false; timer = setTimeout(update, 150); }
    }
  }
  function schedule(event) {
    if (event?.target?.id === 'output-name') return;
    revision++; pending = true; clearTimeout(timer); timer = setTimeout(update, 250);
  }
  function processing() { if (!isBusy() && pending) schedule(); }
  const removeManipulator = attachImageManipulator(host, files[0], {kind,isBusy,onChange:()=>schedule()});
  settings.addEventListener('input', schedule); settings.addEventListener('change', schedule);
  window.addEventListener('mydocpro:processing', processing);
  dispose = () => {
    dead = true; removeManipulator(); revision++; clearTimeout(timer); urls.forEach(URL.revokeObjectURL);
    settings.removeEventListener('input', schedule); settings.removeEventListener('change', schedule);
    window.removeEventListener('mydocpro:processing', processing);
  };
  void update();
}
