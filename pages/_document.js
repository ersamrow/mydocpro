import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#1e6b52" />
        <meta name="application-name" content="MyDocPro" />
        <meta name="apple-mobile-web-app-title" content="MyDocPro" />
        <meta name="google-adsense-account" content="ca-pub-4905030687832208" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Keep the font face in the initial head: deferred CSS must not
            introduce a new heading font after the first paint. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              '@font-face{font-family:"DM Sans Headings";font-style:normal;font-weight:100 1000;font-display:optional;src:url("/fonts/dm-sans-latin-variable.woff2") format("woff2")}',
          }}
        />
        <link
          rel="preload"
          href="/fonts/dm-sans-latin-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
