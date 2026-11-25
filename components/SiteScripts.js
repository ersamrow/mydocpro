import { useEffect } from "react";
import { loadAnalyticsWorker } from "./analytics-worker.js";

const measurementId = "G-YZZFKYVDF4";

function loadAds() {
  if (document.getElementById("mydocpro-ads")) return;
  const script = document.createElement("script");
  script.id = "mydocpro-ads";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4905030687832208";
  document.head.appendChild(script);
}

function loadAnalytics() {
  if (document.getElementById("mydocpro-analytics-loader")) return;
  window.dataLayer ??= [];
  window.gtag ??= function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const tag = document.createElement("script");
  tag.id = "mydocpro-analytics-loader";
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  tag.async = true;
  if (!window.isSecureContext || !navigator.serviceWorker || !window.Worker) {
    document.head.appendChild(tag);
    return;
  }

  loadAnalyticsWorker(tag);
}

export default function SiteScripts() {
  useEffect(() => {
    const production = ["mydocpro.co.in", "www.mydocpro.co.in"].includes(
      window.location.hostname,
    );
    let pending = [];
    function cancel() {
      for (const id of pending) {
        if (window.requestIdleCallback) window.cancelIdleCallback(id);
        else clearTimeout(id);
      }
      pending = [];
    }
    function schedule() {
      cancel();
      if (
        !production ||
        !navigator.onLine ||
        document.readyState !== "complete"
      )
        return;
      for (const task of [loadAds, loadAnalytics]) {
        pending.push(
          window.requestIdleCallback
            ? window.requestIdleCallback(task, { timeout: 1500 })
            : setTimeout(task, 0),
        );
      }
    }
    window.addEventListener("load", schedule);
    window.addEventListener("online", schedule);
    window.addEventListener("offline", cancel);
    schedule();
    return () => {
      cancel();
      window.removeEventListener("load", schedule);
      window.removeEventListener("online", schedule);
      window.removeEventListener("offline", cancel);
    };
  }, []);
  return null;
}
