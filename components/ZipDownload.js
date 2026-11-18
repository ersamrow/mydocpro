import { Button } from "./ui.js";
import { useEffect, useState, useRef } from "react";
import { zipOutputs } from "../src/zip.js";
export default function ZipDownload({ outputs, busy }) {
  const generation = useRef(0);
  const downloadLink = useRef(null);
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
  useEffect(() => {
    if (url) downloadLink.current?.click();
  }, [url]);
  return (
    <div className="zip-download">
      {url ? (
        <Button
          as="a"
          variant="primary"
          ref={downloadLink}
          className="primary"
          download="mydocpro-files.zip"
          href={url}
        >
          Download all (ZIP)
        </Button>
      ) : (
        <Button
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
          {packing ? "Preparing ZIP…" : "Download all (ZIP)"}
        </Button>
      )}
      <span role="status">{error || (url ? "ZIP ready." : "")}</span>
    </div>
  );
}
