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
import Header from "../components/Header.js";
import { Footer } from "../components/Shared.js";
export default function App({ Component, pageProps }) {
  return (
    <div id="app">
      <Header id={pageProps.id} />
      <Component {...pageProps} />
      <Footer />
    </div>
  );
}
