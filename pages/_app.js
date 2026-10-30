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
import Link from "next/link";
import { Logo, Footer } from "../components/Shared.js";
import PwaControls from "../components/PwaControls.js";
export default function App({ Component, pageProps }) {
  return (
    <div id="app">
      <header className="site-header">
        <Logo />
        <nav aria-label="Main navigation">
          <Link href="/#tools">All tools</Link>
          <Link href="/#image">Image tools</Link>
          <Link href="/#pdf">PDF tools</Link>
          <Link href="/exam-photo">Photo presets</Link>
        </nav>
        <PwaControls />
      </header>
      <Component {...pageProps} />
      <Footer />
    </div>
  );
}
