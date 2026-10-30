import Link from "next/link";
import { Breadcrumb, Icon } from "./Shared.js";
import { sitePages } from "../src/site-content.js";
const pages = [
  ["about", "About us", "files"],
  ["help", "Help centre", "sparkles"],
  ["privacy", "Privacy", "shield-check"],
  ["contact", "Contact", "contact-round"],
  ["updates", "What’s new", "zap"],
];
export default function InformationPage({ id, children }) {
  const page = sitePages[id],
    current = pages.find((p) => p[0] === id);
  return (
    <main className={"workspace information-page information-" + id}>
      <section className="page-intro">
        <Breadcrumb title={page.title} />
        <div className="page-intro-heading">
          <span className="page-emblem">
            <Icon name={current[2]} />
          </span>
          <div>
            <span className="page-kicker">
              {id === "contact" ? "WE’RE HERE TO HELP" : "THE MYDOCPRO GUIDE"}
            </span>
            <h1>{page.title}</h1>
          </div>
        </div>
        <p className="page-description">{page.description}</p>
      </section>
      <div className="information-layout">
        <aside className="information-sidebar">
          <nav aria-label="Information pages">
            <span className="sidebar-label">EXPLORE MYDOCPRO</span>
            {pages.map(([key, label, icon]) => (
              <Link
                key={key}
                href={"/" + key}
                aria-current={id === key ? "page" : undefined}
              >
                <Icon name={icon} />
                {label}
                <span className="sidebar-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <Icon name="shield-check" />
            <h2>Your files stay yours.</h2>
            <p>Image and PDF tools process files right on your device.</p>
            <Link href="/#tools">
              Explore the tools <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
        <article className="information-content privacy-page">
          {children}
        </article>
      </div>
    </main>
  );
}
