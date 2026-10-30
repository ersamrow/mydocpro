import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icon } from "./Shared.js";
import { tools } from "../src/tools.js";
export default function Home() {
  const router = useRouter();
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  useEffect(() => {
    const hash = router.asPath.split("#")[1];
    setFilter(["image", "pdf"].includes(hash) ? hash : "all");
    if (hash) document.getElementById("tools")?.scrollIntoView();
  }, [router.asPath]);
  const shown = tools.filter(
    (t) =>
      (filter === "all" || t[3] === filter) &&
      `${t[1]} ${t[2]}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <i /> SMALL TOOLS. BIG HELP.
          </span>
          <h1>
            Free image tools.
            <br />
            <em>Simple PDF tools.</em>
          </h1>
          <p>
            Resize a photo. Tidy up a PDF. Get that form submitted.
            <br /> Free, simple tools that keep your files on your device.
          </p>
          <div className="hero-checks">
            {["100% free", "No sign-up", "No file uploads"].map((t) => (
              <span key={t}>
                <Icon name="check" />
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="art" aria-hidden="true">
          <div className="orbit" />
          <div className="paper">
            <div className="paper-badge">PDF</div>
            <hr />
            <hr />
            <hr />
            <hr />
          </div>
          <div className="photo">
            <div className="landscape">
              <div className="sun" />
              <div className="hill" />
              <div className="hill second" />
            </div>
            <small>just the right size ✦</small>
          </div>
          <span className="float done">
            <Icon name="circle-check" /> Ready to upload
          </span>
          <span className="float safe">
            <Icon name="shield-check" /> Stays on your device
          </span>
          <span className="spark">✧</span>
        </div>
      </section>
      <main className="main" id="tools">
        <div className="quick">
          <Icon name="zap" />
          <strong>IN A HURRY?</strong>
          <div className="quick-links">
            {[
              ["compress-image?kb=20", "Photo under 20 KB"],
              ["compress-image?kb=50", "Photo under 50 KB"],
              ["resize-image", "Resize in cm"],
              ["merge-pdf", "Merge PDFs"],
              ["passport-sheet", "Passport photos"],
            ].map(([id, label]) => (
              <Link className="chip" key={id} href={"/" + id}>
                {label}
              </Link>
            ))}
          </div>
          <span className="arrow">
            <Icon name="arrow-up-right" />
          </span>
        </div>
        <div className="section-head">
          <div>
            <h2>Your everyday toolkit</h2>
            <p>One less thing between you and “submitted”.</p>
          </div>
          <label className="search">
            <Icon name="search" />
            <input
              id="search"
              aria-label="Search tools"
              placeholder="Find a tool…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="filters">
          {[
            ["all", "All tools", "grid2x2"],
            ["image", "Image tools", "image"],
            ["pdf", "PDF tools", "file-text"],
            ["special", "Photo essentials", "sparkles"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              className={"filter " + (filter === id ? "active" : "")}
              onClick={() => setFilter(id)}
            >
              <Icon name={icon} />
              {label}
              <span className="count">
                {id === "all"
                  ? tools.length
                  : tools.filter((t) => t[3] === id).length}
              </span>
            </button>
          ))}
          <span className="result-count">A tool for every little task</span>
        </div>
        <div className="grid" id="grid">
          {shown.map((t) => (
            <Link key={t[0]} className={"card " + t[3]} href={"/" + t[0]}>
              <div className="card-top">
                <span className="tool-icon">
                  <Icon name={t[4]} />
                </span>
                {t[5] && <span className="tag">{t[5]}</span>}
              </div>
              <h3>{t[1]}</h3>
              <p>{t[2]}</p>
              <span className="go">
                <Icon name="arrow-up-right" />
              </span>
            </Link>
          ))}
          {!shown.length && (
            <p className="empty">No tools found. Try “photo” or “PDF”.</p>
          )}
        </div>
        <div className="trust">
          <span className="tool-icon">
            <Icon name="shield-check" />
          </span>
          <div>
            <h3>Your documents are personal. Let’s keep them that way.</h3>
            <p>
              Every file is processed right in your browser. No uploads, no
              accounts, no files stored on our servers.
            </p>
          </div>
          <span className="badge">Private by design</span>
        </div>
      </main>
    </>
  );
}
