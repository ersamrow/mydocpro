import './mobile.css';

export function initPwa() {
  let promptEvent, registration, ready = false, failed = false, waiting = false;
  let installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const dialog = document.createElement('dialog');
  dialog.className = 'pwa-dialog';
  dialog.setAttribute('aria-labelledby','pwa-heading');
  dialog.innerHTML = `<h2 id="pwa-heading">MyDocPro, on your home screen</h2><p>Keep your PDF and image tools a tap away. Your documents stay on your device.</p><p class="pwa-dialog-status" role="status"></p><div class="pwa-install-help"></div><p class="pwa-update" hidden>An update is ready. Finish your work, then close all MyDocPro tabs and app windows and reopen to use it.</p><p>Offline storage contains the app and its tools only. Your selected files and downloads are never saved in the app cache. Your browser may clear offline storage when space is low.</p><div class="pwa-dialog-actions"><button class="primary" data-pwa-prompt hidden>Install MyDocPro</button><button class="secondary" data-pwa-close>Close</button></div>`;
  document.body.append(dialog);
  const help = dialog.querySelector('.pwa-install-help');
  const nativeInstall = dialog.querySelector('[data-pwa-prompt]');
  function statusText() {
    if (ready) return navigator.onLine ? 'Ready offline' : 'Offline · tools ready';
    if (!navigator.onLine) return 'Offline · setup incomplete';
    if (!import.meta.env.PROD) return 'Offline setup in published app';
    return failed ? 'Offline setup unavailable' : 'Preparing offline tools…';
  }
  function paint() {
    document.querySelectorAll('[data-install-app]').forEach(b=>b.textContent=installed?'App & offline':'Install app');
    document.querySelectorAll('[data-app-status]').forEach(el=>el.textContent=statusText());
    dialog.querySelector('.pwa-dialog-status').textContent = statusText()+'.'+(failed?' Stay online and reopen the app to try again.':'');
    dialog.querySelector('.pwa-update').hidden = !waiting;
    nativeInstall.hidden = !promptEvent || installed;
    if (installed) help.innerHTML='<p>MyDocPro is running as an app.</p>';
    else if (promptEvent) help.innerHTML='<p>Tap Install MyDocPro below to add it to your device.</p>';
    else help.innerHTML='<p>If your browser does not show an install prompt:</p><ol><li><strong>iPhone / iPad:</strong> open this site in Safari, tap Share, then Add to Home Screen.</li><li><strong>Android:</strong> open this site in Chrome and look for Install app or Add to Home screen in the menu.</li><li><strong>Computer:</strong> use the install option in your browser’s address bar or menu.</li></ol><p>Using an in-app browser? Open this site in your usual browser first. Installation availability depends on your browser.</p>';
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-install-app]')) { paint(); dialog.showModal(); }
  });
  dialog.querySelector('[data-pwa-close]').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  nativeInstall.onclick=async()=>{
    const event=promptEvent;
    if(!event)return;
    promptEvent=null;
    try { await event.prompt(); await event.userChoice; } finally { paint(); }
  };
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;paint();});
  window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;paint();});
  async function checkOffline() {
    const worker = navigator.serviceWorker?.controller || registration?.active;
    if (!worker) return;
    const channel = new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();failed=true;paint();},10000);
    channel.port1.onmessage=event=>{clearTimeout(timer);ready=event.data?.ready===true;failed=!ready;channel.port1.close();paint();};
    worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
  }
  window.addEventListener('online',()=>{paint();checkOffline();registration?.update().catch(()=>{});});
  window.addEventListener('offline',()=>{paint();checkOffline();});
  window.addEventListener('mydocpro:route',paint);
  paint();
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {failed=true;paint();return;}
  navigator.serviceWorker.addEventListener('controllerchange',checkOffline);
  navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{
    registration=reg;
    waiting=!!reg.waiting;
    const watch=worker=>worker?.addEventListener('statechange',()=>{
      if(worker.state==='installed'){waiting=!!navigator.serviceWorker.controller;paint();}
      if(worker.state==='activated')checkOffline();
      if(worker.state==='redundant'&&!reg.active){failed=true;paint();}
    });
    watch(reg.installing);
    reg.addEventListener('updatefound',()=>watch(reg.installing));
    if(reg.active)checkOffline();
    paint();
  }).catch(()=>{failed=true;paint();});
}
