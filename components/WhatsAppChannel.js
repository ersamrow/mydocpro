import { ArrowUpRight, MessageCircle } from "lucide-react";
import styles from "./WhatsAppChannel.module.css";

const channelUrl = "https://whatsapp.com/channel/0029Vb9UJoV0G0XlFoX2C53h";

export default function WhatsAppChannel({ visible = true }) {
  return (
    <div
      className={`${styles.slot} ${visible ? "" : styles.pending}`}
      aria-hidden={visible ? undefined : true}
    >
      <a
        className={styles.button}
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? undefined : -1}
      >
        <MessageCircle width={20} height={20} aria-hidden="true" />
        <span>Join our WhatsApp channel</span>
        <ArrowUpRight width={16} height={16} aria-hidden="true" />
      </a>
    </div>
  );
}
