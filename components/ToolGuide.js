import Link from "next/link";
import { guides } from "../src/tool-guides.js";
import { tools } from "../src/tools.js";
export default function ToolGuide({ id }) {
  const g = guides[id],
    tool = tools.find((t) => t[0] === id);
  const related = [
    tools.find((t) => t[0] === g[5]),
    ...tools
      .filter((t) => t[3] === tool[3] && t[0] !== id && t[0] !== g[5])
      .slice(0, 2),
  ];
  return (
    <section className="tool-guide" aria-label="Tool guidance">
      <h2>{g[0]}</h2>
      <p>{g[1]}</p>
      <h3>Worked example and checks</h3>
      <p>{g[2]}</p>
      <h3>{g[3]}</h3>
      <p>{g[4]}</p>
      <h3>Related tools</h3>
      <ul className="related-tools">
        {related.map((t) => (
          <li key={t[0]}>
            <Link href={"/" + t[0]}>{t[1]}</Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/help">Troubleshooting and file privacy</Link>
      </p>
    </section>
  );
}
