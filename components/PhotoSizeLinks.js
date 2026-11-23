import Link from "next/link";
import { photoSizes } from "../src/photo-sizes.js";
export default function PhotoSizeLinks({ exclude }) {
  return (
    <nav
      className="exam-links exam-links-footer"
      aria-label="Common photo sizes"
    >
      <h2>Common photo sizes</h2>
      <ul>
        {photoSizes
          .filter((s) => s.slug !== exclude)
          .map((s) => (
            <li key={s.slug}>
              <Link prefetch={false} href={"/resize-image/" + s.slug}>
                {s.label}
              </Link>
            </li>
          ))}
        <li>
          <Link href="/cm-to-pixels">CM to pixels calculator</Link>
        </li>
      </ul>
    </nav>
  );
}
