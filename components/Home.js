import TrustBadges from "./TrustBadges.js";
import ExamLinks from "./ExamLinks.js";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icon } from "./Shared.js";
import ToolCards from "./ToolCards.js";
import { tools } from "../src/tools.js";
export default function Home({ heading, cards, examLinks }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  useEffect(() => {
    // Keep text entered into the prerendered input before React was ready.
    const value = document.getElementById("search")?.value;
    if (value) setSearch(value);
  }, []);
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
          <h1>{heading}</h1>
          <p>
            Resize a photo. Tidy up a PDF. Get that form submitted.
            <br /> Free, simple tools that keep your files on your device.
          </p>
          <TrustBadges toolId="" />
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
          <div className="search">
            <Icon name="search" />
            <input
              id="search"
              aria-label="Search tools"
              placeholder="Find a tool…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  document.getElementById("search")?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>
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
              aria-pressed={filter === id}
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
          <span className="result-count" role="status">
            {shown.length} {shown.length === 1 ? "tool" : "tools"} available
          </span>
        </div>
        <ToolCards shown={shown} cards={cards}>
          {!shown.length && (
            <div className="empty">
              <h3>No matching tools</h3>
              <p>Try “photo” or “PDF”, or browse the full toolkit.</p>
              <button
                className="secondary"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  document.getElementById("search")?.focus();
                }}
              >
                Show all tools
              </button>
            </div>
          )}
        </ToolCards>
        <ExamLinks exams={examLinks} />
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
