import { useEffect, useState } from "react";

/**
 * Returns an object URL for a Blob/File, revoked automatically when the blob
 * changes or the component unmounts. Returns "" until the URL is ready and
 * never returns a URL belonging to a previous blob.
 */
export function useObjectUrl(blob) {
  const [resource, setResource] = useState(null);
  useEffect(() => {
    if (!blob) {
      setResource(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setResource({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return blob && resource?.blob === blob ? resource.url : "";
}
