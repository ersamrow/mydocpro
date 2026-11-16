import { useEffect, useState } from "react";
import Script from "next/script";

const measurementId = "G-YZZFKYVDF4";

export default function SiteScripts() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!online || document.getElementById("mydocpro-ads")) return;
    let idle;
    function loadAds() {
      const script = document.createElement("script");
      script.id = "mydocpro-ads";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4905030687832208";
      document.head.appendChild(script);
    }
    function scheduleAds() {
      // AdSense accepts its native script attributes only.
      if (window.requestIdleCallback)
        idle = window.requestIdleCallback(loadAds, { timeout: 1500 });
      else loadAds();
    }
    if (document.readyState === "complete") scheduleAds();
    else window.addEventListener("load", scheduleAds, { once: true });
    return () => {
      window.removeEventListener("load", scheduleAds);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, [online]);

  if (!online) return null;
  const analyticsEnabled = ["mydocpro.co.in", "www.mydocpro.co.in"].includes(
    window.location.hostname,
  );

  return (
    analyticsEnabled && (
      <>
        <Script id="mydocpro-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
          window.gtag('js', new Date());
          window.gtag('config', '${measurementId}');`}
        </Script>
        <Script
          id="mydocpro-analytics-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
          strategy="lazyOnload"
        />
      </>
    )
  );
}
