import { useEffect, useState } from "react";
import Script from "next/script";

const measurementId = "G-YZZFKYVDF4";

export default function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      ["mydocpro.co.in", "www.mydocpro.co.in"].includes(
        window.location.hostname,
      ),
    );
  }, []);

  if (!enabled) return null;

  return (
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
        strategy="afterInteractive"
      />
    </>
  );
}
