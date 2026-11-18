import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import { isBackdropClick } from "./dialog.js";
import styles from "./DownloadFollowPrompt.module.css";

const channelUrl = "https://whatsapp.com/channel/0029Vb9UJoV0G0XlFoX2C53h";

export default function DownloadFollowPrompt() {
  const dialog = useRef(null);
  const downloadLink = useRef(null);
  const { events } = useRouter();

  useEffect(() => {
    let timer;
    function onDownloadClick(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;

      const link = event.target.closest("a[download]");
      const href = link?.getAttribute("href")?.trim();
      if (
        !link?.closest(".tool-workspace") ||
        !href ||
        href.startsWith("#") ||
        !["blob:", "data:", "https:", "http:"].includes(link.protocol) ||
        link.getAttribute("aria-disabled") === "true"
      )
        return;

      // Let the browser perform the download before opening an optional prompt.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (
          event.defaultPrevented ||
          !link.isConnected ||
          !dialog.current?.isConnected ||
          document.querySelector("dialog[open]")
        )
          return;
        downloadLink.current = link;
        dialog.current.showModal();
      }, 0);
    }
    function onNavigation() {
      clearTimeout(timer);
      downloadLink.current = null;
      dialog.current?.close();
    }
    document.addEventListener("click", onDownloadClick);
    events.on("routeChangeStart", onNavigation);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onDownloadClick);
      events.off("routeChangeStart", onNavigation);
    };
  }, [events]);

  function close() {
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="download-follow-title"
      aria-describedby="download-follow-description"
      onClose={() => {
        if (downloadLink.current?.isConnected)
          downloadLink.current.focus({ preventScroll: true });
        downloadLink.current = null;
      }}
      onClick={(event) => {
        if (isBackdropClick(event)) close();
      }}
    >
      <button
        className={styles.close}
        type="button"
        aria-label="Close WhatsApp channel suggestion"
        onClick={close}
        autoFocus
      >
        <X width={20} height={20} aria-hidden="true" />
      </button>
      <div className={styles.icon} aria-hidden="true">
        <MessageCircle width={26} height={26} />
      </div>
      <h2 id="download-follow-title">Get updates from MyDocPro</h2>
      <p id="download-follow-description">
        Follow our WhatsApp channel for new tools and helpful tips. It’s free
        and optional — you can download your files without joining.
      </p>
      <div className={styles.actions}>
        <a
          className={styles.follow}
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
        >
          Join WhatsApp channel
          <ArrowUpRight width={18} height={18} aria-hidden="true" />
        </a>
        <button className={styles.dismiss} type="button" onClick={close}>
          Not now
        </button>
      </div>
    </dialog>
  );
}
