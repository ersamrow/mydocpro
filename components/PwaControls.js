import { Button } from "./ui.js";
import { isBackdropClick } from "./dialog.js";
import { useEffect, useRef, useState } from "react";
import styles from "./PwaControls.module.css";
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
      const available = !!(
        navigator.serviceWorker?.controller || registration?.active
      );
      setReady(available);
      if (available) setFailed(false);
      return available;
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
    listen(window, "pageshow", (event) => {
      if (event.persisted) {
        setOnline(navigator.onLine);
        check();
      }
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
        navigator.serviceWorker.ready.then((reg) => {
          if (disposed) return;
          registration = reg;
          check();
        });
        listen(navigator.serviceWorker, "controllerchange", check);
        const register = () =>
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
                    if (worker.state === "redundant" && !check())
                      setFailed(true);
                  });
              };
              watch(reg.installing);
              listen(reg, "updatefound", () => watch(reg.installing));
              if (reg.active) check();
            })
            .catch(() => {
              if (disposed) return;
              if (navigator.serviceWorker.controller) check();
              else setFailed(true);
            });
        const scheduleRegistration = () => {
          if ("requestIdleCallback" in window) {
            const id = window.requestIdleCallback(register, { timeout: 1500 });
            cleanups.push(() => window.cancelIdleCallback(id));
          } else {
            const id = setTimeout(register, 0);
            cleanups.push(() => clearTimeout(id));
          }
        };
        if (document.readyState === "complete") scheduleRegistration();
        else listen(window, "load", scheduleRegistration);
      }
    }
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);
  const status = ready
    ? online
      ? "✓ Works offline"
      : "✓ Works offline"
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
        <Button
          className={`app-status ${styles.statusButton}`}
          data-install-app={prompt && !installed ? true : undefined}
          aria-label={`${installed ? "App and offline status" : "Install MyDocPro"}: ${status}`}
          onClick={() => dialog.current.showModal()}
        >
          <span className={styles.installLabel}>
            {installed ? "App & offline" : "Install app"}
          </span>
          <span
            className={styles.offlineStatus}
            data-app-status
            role="status"
            title={status}
          >
            {status}
          </span>
        </Button>
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
            <Button
              className="primary"
              onClick={async () => {
                const event = prompt;
                setPrompt(null);
                await event.prompt();
                await event.userChoice;
              }}
            >
              Install MyDocPro
            </Button>
          )}
          <Button className="secondary" onClick={() => dialog.current.close()}>
            Close
          </Button>
        </div>
      </dialog>
    </>
  );
}
