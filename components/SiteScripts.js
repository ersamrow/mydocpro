import { useEffect } from "react";
import { loadAnalyticsWorker } from "./analytics-worker.js";

const measurementId = "G-YZZFKYVDF4";
const clarityProjectId = "zk587fqpuf";

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

function loadClarity() {
  if (document.getElementById("mydocpro-clarity-loader")) return;
  window.clarity ??= function () {
    (window.clarity.q ??= []).push(arguments);
  };
  // No visitor cookie consent is collected yet; keep Clarity in limited mode.
  window.clarity("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "denied",
  });

  const script = document.createElement("script");
  script.id = "mydocpro-clarity-loader";
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${clarityProjectId}?ref=bwt`;
  document.head.appendChild(script);
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
      for (const task of [loadAds, loadAnalytics, loadClarity]) {
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
