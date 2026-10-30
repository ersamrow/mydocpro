import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Logo, Icon } from "./Shared.js";
import { tools } from "../src/tools.js";
import PwaControls from "./PwaControls.js";
export default function Header({ id }) {
  const router = useRouter();
  const category = tools.find((tool) => tool[0] === id)?.[3];
  const [hash, setHash] = useState("");
  useEffect(() => setHash(router.asPath.split("#")[1] || ""), [router.asPath]);
  const active =
    category || (["image", "pdf"].includes(hash) ? hash : !id ? "all" : null);
  return (
    <header className="site-header">
      <div className="header-identity">
        <Logo />
        <span className="header-tagline">A little less paperwork.</span>
      </div>
      <nav aria-label="Main navigation">
        {[
          ["all", "/#tools", "All tools", "grid2x2"],
          ["image", "/#image", "Images", "image"],
          ["pdf", "/#pdf", "PDF tools", "file-text"],
          ["special", "/exam-photo", "Photo presets", "contact-round"],
        ].map(([key, href, label, icon]) => (
          <Link
            key={key}
            href={href}
            className={active === key ? "nav-active" : undefined}
            aria-current={active === key ? "location" : undefined}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <PwaControls />
    </header>
  );
}
