import Link from "next/link";
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
} from "lucide-react";
const icons = {
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
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <Logo />
        <p>Made for your everyday paperwork. Built for your privacy.</p>
      </div>
      <nav aria-labelledby="footer-projects">
        <h2 id="footer-projects">Our projects</h2>
        <div className="footer-projects">
          <a href="https://greetlo.in/">
            <strong>Greetlo <ArrowUpRight aria-hidden="true" /></strong>
            <span>Create and share personalized greeting cards.</span>
          </a>
          <a href="https://myledgerpro.in/">
            <strong>MyLedgerPro <ArrowUpRight aria-hidden="true" /></strong>
            <span>Track customer balances, loans, and repayments.</span>
          </a>
        </div>
      </nav>
      <div className="footer-bottom">
        <nav className="foot-links" aria-label="MyDocPro information">
          <ContentLinks />
        </nav>
        <small>© {new Date().getFullYear()} MyDocPro</small>
      </div>
    </footer>
  );
}
