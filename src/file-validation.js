export function throwIfCancelled(signal) {
  if (signal?.aborted)
    throw new DOMException("Processing cancelled.", "AbortError");
}
export async function checkpoint(signal) {
  throwIfCancelled(signal);
  await new Promise((resolve) => setTimeout(resolve, 0));
  throwIfCancelled(signal);
}
export async function inspectFiles(files, pdf) {
  for (const file of files) {
    if (!file.size)
      throw Error(`${file.name} is empty. Choose a file with content.`);
    const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    if (pdf) {
      if (!new TextDecoder().decode(bytes).includes("%PDF-"))
        throw Error(
          `${file.name} is not a valid PDF. Export it as PDF and try again.`,
        );
    } else {
      const png =
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71;
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp =
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
      if (!png && !jpg && !webp)
        throw Error(
          `${file.name} is not a supported image. Export it as JPG, PNG or WebP.`,
        );
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        if (img.width * img.height > 50000000)
          throw Error("Please use images under 50 megapixels.");
      } catch (e) {
        throw Error(
          `${file.name}: ${e.message.includes("megapixels") ? e.message : "The image is damaged or cannot be decoded. Export a fresh copy."}`,
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }
}
