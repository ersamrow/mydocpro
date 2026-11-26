import "../src/theme-tokens.css";
import "../src/trust-badges.css";
import "../src/content.css";
import "../src/style.css";
import "../src/brand.css";
import "../src/header.css";
import "../src/tool-panel.css";
import "../src/image-manipulator.css";
import "../src/image-previews.css";
import "../src/pdf-editor.css";
import "../src/pdf-previews.css";
import "../src/page-cards.css";
import "../src/mobile.css";
import "../src/upload-controls.css";
import "../src/interface.css";
import "../src/combined-workspace.css";
import "../src/image-studio.css";
import "../src/merge-workspace.css";
import "../src/shared-ui.css";
import "../src/typography.css";
import "../src/convert-workspace.css";
import "../src/ui.css";
import "../src/sign-pdf.css";
import Header from "../components/Header.js";
import SiteScripts from "../components/SiteScripts.js";
import { Footer } from "../components/Shared.js";
import { useEffect } from "react";
import { catalogTool, listDocumentTools } from "../src/agent-catalog.js";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const context = navigator.modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    context.registerTool(
      {
        ...catalogTool,
        execute: async () => ({
          content: [
            { type: "text", text: JSON.stringify(listDocumentTools()) },
          ],
        }),
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, []);
  return (
    <div id="app">
      {!pageProps.exam && <SiteScripts />}
      <Header id={pageProps.exam ? "exam-photo" : pageProps.id} />
      <Component {...pageProps} />
      <Footer examLinks={pageProps.examLinks} />
    </div>
  );
}
