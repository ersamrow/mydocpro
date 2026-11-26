import { Button, Card } from "./ui.js";
import ResizeFaqs from "./ResizeFaqs.js";
import { homeFaqs } from "../src/tool-faqs.js";
import TrustBadges from "./TrustBadges.js";
import ExamLinks from "./ExamLinks.js";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icon } from "./Shared.js";
import ToolCards from "./ToolCards.js";
import { tools } from "../src/tools.js";
import { photoSizes } from "../src/photo-sizes.js";
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
              ...photoSizes.map(({ slug, label }) => [
                "resize-image/" + slug,
                label,
              ]),
              ["cm-to-pixels", "CM to pixels"],
              ["merge-pdf", "Merge PDFs"],
              ["passport-sheet", "Passport photos"],
            ].map(([id, label]) => (
              <Link
                prefetch={
                  id.startsWith("resize-image/") || id === "cm-to-pixels"
                    ? false
                    : undefined
                }
                className="chip"
                key={id}
                href={"/" + id}
              >
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
              <Button
                type="button"
                className="clear-search"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  document.getElementById("search")?.focus();
                }}
              >
                ×
              </Button>
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
            <Button
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
            </Button>
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
              <Button
                className="secondary"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  document.getElementById("search")?.focus();
                }}
              >
                Show all tools
              </Button>
            </div>
          )}
        </ToolCards>
        <ExamLinks exams={examLinks} />
        <Card className="tool-guide">
          <h2>Choose a tool for your application documents</h2>
          <ul>
            <li>
              <Link href="/resize-image">Resize a photo in cm and KB</Link>: set
              dimensions, DPI and a maximum file size together. For a specific
              shape, open the{" "}
              <Link href="/resize-image/3-5x4-5-cm" prefetch={false}>
                3.5 × 4.5 cm photo preset
              </Link>{" "}
              and check your form’s requirements.
            </li>
            <li>
              <Link href="/merge-pdf">
                Merge PDFs and images without uploading
              </Link>
              : arrange applications, certificates and photos into one PDF, then
              check the page order before submitting.
            </li>
            <li>
              <Link href="/join-images">
                Join Aadhaar front and back for A4 printing
              </Link>
              : choose the matching preset and A4 output, then adjust white
              space and placement before downloading. Use non-sensitive samples
              when sharing examples or reporting a problem.
            </li>
          </ul>
        </Card>
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
        <Card className="tool-guide">
          <ResizeFaqs faqs={homeFaqs} />
        </Card>
      </main>
    </>
  );
}
