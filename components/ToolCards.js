import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Icon } from "./Shared.js";
import { Card } from "./ui.js";

// Only used by getStaticProps. Card text and icons come from the local tool catalog.
export function ToolCard({
  tool: [id, title, description, category, icon, tag],
}) {
  return (
    <Card as="a" className={"card " + category} href={"/" + id}>
      <div className="card-top">
        <span className="tool-icon">
          <Icon name={icon} />
        </span>
        {tag && <span className="tag">{tag}</span>}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="go">
        <Icon name="arrow-up-right" />
      </span>
    </Card>
  );
}

export default function ToolCards({ shown, cards, children }) {
  const ref = useRef(null);
  const router = useRouter();
  useEffect(() => {
    const grid = ref.current;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const prefetched = new Set();
    let idle;
    function navigate(event) {
      const link = event.target.closest?.("a.card[href]");
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target ||
        link.hasAttribute("download")
      )
        return;
      event.preventDefault();
      void router.push(link.getAttribute("href"));
    }
    function prefetch(event) {
      const href = event.target.closest?.("a.card[href]")?.getAttribute("href");
      if (!href || prefetched.has(href)) return;
      prefetched.add(href);
      router.prefetch(href).catch(() => prefetched.delete(href));
    }
    function enable() {
      grid.addEventListener("click", navigate, options);
      grid.addEventListener("focusin", prefetch, options);
      grid.addEventListener("pointerover", prefetch, options);
    }
    function afterLoad() {
      if ("requestIdleCallback" in window)
        idle = window.requestIdleCallback(enable, { timeout: 1000 });
      else enable();
    }
    // Native anchors already work on a cold visit. An early card interaction
    // also enables same-document routing before the click reaches the grid.
    grid.addEventListener("click", enable, {
      ...options,
      once: true,
      capture: true,
    });
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { ...options, once: true });
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      controller.abort();
    };
  }, [router]);
  if (!shown.length)
    return (
      <div ref={ref} className="grid" id="grid">
        {children}
      </div>
    );

  return (
    <div
      ref={ref}
      className="grid"
      id="grid"
      dangerouslySetInnerHTML={{
        __html: shown.map(([id]) => cards[id]).join(""),
      }}
    />
  );
}
