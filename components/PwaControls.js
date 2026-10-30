import { isBackdropClick } from "./dialog.js";
import { useEffect, useRef, useState } from "react";
export default function PwaControls() {
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [online, setOnline] = useState(true),
    [installed, setInstalled] = useState(false),
    [waiting, setWaiting] = useState(false),
    [prompt, setPrompt] = useState(null);
  const dialog = useRef(null);
  useEffect(() => {
    let disposed = false,
      registration;
    const cleanups = [];
    const listen = (target, type, fn) => {
      target.addEventListener(type, fn);
      cleanups.push(() => target.removeEventListener(type, fn));
    };
    setOnline(navigator.onLine);
    setInstalled(
      matchMedia("(display-mode: standalone)").matches ||
        !!navigator.standalone,
    );
    function check() {
      const worker =
        navigator.serviceWorker?.controller || registration?.active;
      if (!worker) return;
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        if (!disposed) setFailed(true);
      }, 10000);
      cleanups.push(() => {
        clearTimeout(timer);
        channel.port1.close();
      });
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        channel.port1.close();
        if (!disposed) {
          setReady(e.data?.ready === true);
          setFailed(!e.data?.ready);
        }
      };
      worker.postMessage({ type: "OFFLINE_STATUS" }, [channel.port2]);
    }
    listen(window, "online", () => {
      setOnline(true);
      check();
      registration?.update().catch(() => {});
    });
    listen(window, "offline", () => {
      setOnline(false);
      check();
    });
    listen(window, "beforeinstallprompt", (e) => {
      e.preventDefault();
      setPrompt(e);
    });
    listen(window, "appinstalled", () => {
      setInstalled(true);
      setPrompt(null);
    });
    if (process.env.NODE_ENV === "production") {
      if (!("serviceWorker" in navigator) || !window.isSecureContext)
        setFailed(true);
      else {
        listen(navigator.serviceWorker, "controllerchange", check);
        navigator.serviceWorker
          .register("/sw.js", { scope: "/", updateViaCache: "none" })
          .then((reg) => {
            if (disposed) return;
            registration = reg;
            setWaiting(!!reg.waiting);
            const watch = (worker) => {
              if (worker)
                listen(worker, "statechange", () => {
                  if (worker.state === "installed")
                    setWaiting(!!navigator.serviceWorker.controller);
                  if (worker.state === "activated") check();
                  if (worker.state === "redundant" && !reg.active)
                    setFailed(true);
                });
            };
            watch(reg.installing);
            listen(reg, "updatefound", () => watch(reg.installing));
            if (reg.active) check();
          })
          .catch(() => {
            if (!disposed) setFailed(true);
          });
      }
    }
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);
  const status = ready
    ? online
      ? "Ready offline"
      : "Offline · tools ready"
    : !online
      ? "Offline · setup incomplete"
      : process.env.NODE_ENV !== "production"
        ? "Offline setup in published app"
        : failed
          ? "Offline setup unavailable"
          : "Preparing offline tools…";
  return (
    <>
      <div className="app-controls">
        <button
          className="install-button"
          data-install-app
          onClick={() => dialog.current.showModal()}
        >
          {installed ? "App & offline" : "Install app"}
        </button>
        <span className="app-status" data-app-status role="status">
          {status}
        </span>
      </div>
      <dialog
        ref={dialog}
        className="pwa-dialog"
        aria-labelledby="pwa-heading"
        onClick={(e) => {
          if (isBackdropClick(e)) dialog.current.close();
        }}
      >
        <h2 id="pwa-heading">MyDocPro, on your home screen</h2>
        <p>
          Keep your PDF and image tools a tap away. Your documents stay on your
          device.
        </p>
        <p className="pwa-dialog-status">{status}.</p>
        <p hidden={!waiting}>
          An update is ready. Finish your work, then close all MyDocPro tabs and
          app windows and reopen to use it.
        </p>
        {installed ? (
          <p>MyDocPro is running as an app.</p>
        ) : (
          <div className="pwa-install-help">
            <p>
              Install from your browser menu, or use Share → Add to Home Screen
              on iPhone and iPad.
            </p>
            <p>
              If using an in-app browser, open the site in your usual browser
              first.
            </p>
          </div>
        )}
        <p>
          Your files and downloads are never saved in the app cache. Browser
          storage eviction may remove offline availability.
        </p>
        <div className="pwa-dialog-actions">
          {prompt && !installed && (
            <button
              className="primary"
              onClick={async () => {
                const event = prompt;
                setPrompt(null);
                await event.prompt();
                await event.userChoice;
              }}
            >
              Install MyDocPro
            </button>
          )}
          <button className="secondary" onClick={() => dialog.current.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
