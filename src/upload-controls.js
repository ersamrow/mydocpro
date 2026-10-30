
let refresh = () => {};
export function refreshUploadControls(count) { refresh(count); }

export function setupUploadControls({upload, drop, onChoose, isBusy}) {
  const toolbar = document.createElement('div');
  toolbar.className = 'upload-actions';
  toolbar.hidden = true;
  const summary = document.createElement('span');
  summary.className = 'upload-summary';
  summary.setAttribute('role', 'status');
  const actions = document.createElement('div');
  actions.className = 'upload-buttons';
  let append = upload.multiple;
  function choose(mode) {
    if (isBusy()) return;
    append = mode;
    upload.value = ''; // Allow choosing the same file again.
    upload.click();
  }
  if (upload.multiple) {
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'secondary';
    add.textContent = 'Add more files';
    add.onclick = () => choose(true);
    actions.append(add);
  }
  const replace = document.createElement('button');
  replace.type = 'button'; replace.className = 'secondary';
  replace.textContent = upload.multiple ? 'Replace all' : 'Upload another file';
  replace.onclick = () => choose(false);
  actions.append(replace);
  toolbar.append(summary, actions);
  drop.after(toolbar);

  // Cancellation and rejected files leave the existing selection untouched.
  upload.onclick = () => { upload.value = ''; };
  upload.onchange = () => {
    const selected = [...upload.files];
    if (selected.length) onChoose(selected, append);
  };
  drop.ondragover = event => {event.preventDefault();if (!isBusy()) drop.classList.add('over');};
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = event => {
    event.preventDefault();drop.classList.remove('over');
    if (!isBusy()) onChoose([...event.dataTransfer.files], upload.multiple);
  };
  refresh = count => {
    drop.hidden = count > 0;
    toolbar.hidden = !count;
    drop.closest('.workpanel').classList.toggle('has-files', count > 0);
    summary.textContent = `${count} ${count === 1 ? 'file' : 'files'} selected`;
    if (!count) { append = upload.multiple; upload.value = ''; }
  };
}
