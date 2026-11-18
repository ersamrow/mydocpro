import Link from "next/link";
import ExamLinks from "./ExamLinks.js";
import WhatsAppChannel from "./WhatsAppChannel.js";
import {
  Files,
  ShieldCheck,
  Check,
  CircleCheck,
  Zap,
  ArrowUpRight,
  Search,
  Grid2x2,
  Image,
  FileText,
  Sparkles,
  Minimize2,
  Expand,
  Replace,
  Crop,
  Scissors,
  FileDown,
  FileImage,
  ContactRound,
  PenLine,
  LayoutGrid,
  Images,
  Layers,
  Type,
  Combine,
  Sun,
  ArrowLeft,
  Upload,
  WandSparkles,
  Menu,
  Trash2,
} from "lucide-react";
const icons = {
  Menu,
  Files,
  ShieldCheck,
  Check,
  CircleCheck,
  Zap,
  ArrowUpRight,
  Search,
  Grid2x2,
  Image,
  FileText,
  Sparkles,
  Minimize2,
  Expand,
  Replace,
  Crop,
  Scissors,
  FileDown,
  FileImage,
  ContactRound,
  PenLine,
  LayoutGrid,
  Images,
  Layers,
  Type,
  Combine,
  Sun,
  ArrowLeft,
  Upload,
  WandSparkles,
  Trash2,
};
export function Icon({ name }) {
  const Component =
    icons[name.replace(/(^|-)(\w)/g, (_, dash, c) => c.toUpperCase())] || Files;
  return <Component aria-hidden="true" />;
}
export function Logo() {
  return (
    <Link className="brand" href="/" aria-label="MyDocPro home">
      <img
        className="brand-logo"
        src="/icons/icon.svg"
        width="48"
        height="48"
        alt=""
      />
      <span>
        MyDoc<span>Pro</span>
      </span>
    </Link>
  );
}
export function ContentLinks() {
  return (
    <>
      {[
        ["about", "About"],
        ["help", "Help"],
        ["privacy", "Privacy"],
        ["contact", "Contact"],
        ["updates", "Updates"],
      ].map(([id, name]) => (
        <Link key={id} href={"/" + id}>
          {name}
        </Link>
      ))}
    </>
  );
}
export function Breadcrumb({ title }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href="/">MyDocPro</Link>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
export function Footer({ examLinks }) {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <Logo />
        <p>Made for your everyday paperwork. Built for your privacy.</p>
        <p>
          MyDocPro is free to use. No account, no watermark, and your files stay
          on your device.
        </p>
        <WhatsAppChannel />
      </div>
      <nav aria-labelledby="footer-projects">
        <h2 id="footer-projects">Our Products</h2>
        <div className="footer-projects">
          <a href="https://greetlo.in/">
            <strong>
              <span className="footer-product-brand">
                <img
                  src="/brand/greetlo-logo.webp"
                  alt="Greetlo"
                  width="640"
                  height="234"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <ArrowUpRight aria-hidden="true" />
            </strong>
            <span>Create and share personalized greeting cards.</span>
          </a>
          <a href="https://myledgerpro.in/">
            <strong>
              <span className="footer-product-brand">
                <img
                  src="/brand/myledgerpro-logo.png"
                  alt=""
                  width="512"
                  height="512"
                  loading="lazy"
                  decoding="async"
                />
                MyLedgerPro
              </span>
              <ArrowUpRight aria-hidden="true" />
            </strong>
            <span>Track customer balances, loans, and repayments.</span>
          </a>
        </div>
      </nav>
      <ExamLinks exams={examLinks} footer />
      <div className="footer-bottom">
        <nav className="foot-links" aria-label="MyDocPro information">
          <ContentLinks />
        </nav>
        <small>© {new Date().getFullYear()} MyDocPro</small>
      </div>
    </footer>
  );
}
