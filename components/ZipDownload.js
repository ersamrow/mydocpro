import { useEffect, useState, useRef } from "react";
import { zipOutputs } from "../src/zip.js";
export default function ZipDownload({ outputs, busy }) {
  const generation = useRef(0);
  const [url, setUrl] = useState(""),
    [packing, setPacking] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    generation.current++;
    setUrl("");
    setError("");
    return () => {
      generation.current++;
    };
  }, [outputs]);
  return (
    <div className="zip-download">
      {url ? (
        <a className="primary" download="mydocpro-files.zip" href={url}>
          Download ZIP ↓
        </a>
      ) : (
        <button
          className="primary"
          disabled={busy || packing}
          onClick={async () => {
            const version = generation.current;
            setPacking(true);
            setError("");
            try {
              const blob = await zipOutputs(outputs);
              if (version === generation.current)
                setUrl(URL.createObjectURL(blob));
            } catch (e) {
              if (version === generation.current) setError(e.message);
            } finally {
              if (version === generation.current) setPacking(false);
            }
          }}
        >
          {packing ? "Preparing ZIP…" : "Prepare all files as ZIP"}
        </button>
      )}
      <span role="status">{error || (url ? "ZIP ready." : "")}</span>
    </div>
  );
}
