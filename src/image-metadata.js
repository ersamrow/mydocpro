const jpegStart = (bytes) => bytes[0] === 255 && bytes[1] === 216;

function jpegSegments(bytes) {
  if (!jpegStart(bytes)) throw Error("Could not read the JPG header.");
  const segments = [];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) throw Error("Invalid JPG marker.");
    while (bytes[offset + 1] === 255) offset++;
    const marker = bytes[offset + 1];
    if (marker === 218 || marker === 217) {
      return { segments, scan: offset };
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length)
      throw Error("Incomplete JPG header.");
    segments.push({ marker, offset, length });
    offset += length + 2;
  }
  throw Error("Could not find the JPG image data.");
}

export async function jpegSampling(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { segments } = jpegSegments(bytes);
  const frame = segments.find(({ marker }) => [192, 193, 194].includes(marker));
  if (!frame) return null;
  const count = bytes[frame.offset + 9];
  const factors = Array.from(
    { length: count },
    (_, index) => bytes[frame.offset + 11 + index * 3],
  );
  return factors.every((value) => value === 17) ? "4:4:4" : "subsampled";
}

// COM markers do not affect the entropy-coded image, so padding never changes pixels.
export async function padJpegToBytes(blob, requestedBytes) {
  const target = Math.ceil(requestedBytes);
  if (!Number.isFinite(target) || target < 0 || target > 25000000)
    throw Error("Invalid JPG padding size.");
  if (blob.size >= target) return blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { scan } = jpegSegments(bytes);
  const comments = [];
  let remaining = Math.max(4, target - blob.size);
  while (remaining > 0) {
    let total = Math.min(65537, remaining);
    if (remaining > total && remaining - total < 4)
      total -= 4 - (remaining - total);
    const segment = new Uint8Array(total).fill(32);
    segment.set([255, 254, (total - 2) >> 8, (total - 2) & 255]);
    comments.push(segment);
    remaining -= total;
  }
  return new Blob([blob.slice(0, scan), ...comments, blob.slice(scan)], {
    type: "image/jpeg",
  });
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function setImageDensity(blob, dpi) {
  const density = Math.round(Number(dpi));
  if (!Number.isFinite(density) || density < 1 || density > 65535)
    throw Error("DPI must be between 1 and 65,535.");
  if (!["image/jpeg", "image/png"].includes(blob.type)) return blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === "image/jpeg") {
    const { segments } = jpegSegments(bytes);
    const jfif = segments.find(
      ({ marker, offset, length }) =>
        marker === 224 &&
        length >= 16 &&
        String.fromCharCode(...bytes.slice(offset + 4, offset + 9)) ===
          "JFIF\0",
    );
    const values = Uint8Array.of(
      1,
      density >> 8,
      density & 255,
      density >> 8,
      density & 255,
    );
    if (jfif) {
      bytes.set(values, jfif.offset + 11);
      return new Blob([bytes], { type: blob.type });
    }
    const marker = Uint8Array.of(
      255,
      224,
      0,
      16,
      74,
      70,
      73,
      70,
      0,
      1,
      1,
      ...values,
      0,
      0,
    );
    return new Blob([bytes.slice(0, 2), marker, bytes.slice(2)], {
      type: blob.type,
    });
  }
  if (String.fromCharCode(...bytes.slice(1, 4)) !== "PNG" || bytes[0] !== 137)
    throw Error("Could not read the PNG header.");
  const physical = new Uint8Array(21);
  const view = new DataView(physical.buffer);
  view.setUint32(0, 9);
  physical.set([112, 72, 89, 115], 4);
  const pixelsPerMetre = Math.round(density / 0.0254);
  view.setUint32(8, pixelsPerMetre);
  view.setUint32(12, pixelsPerMetre);
  physical[16] = 1;
  view.setUint32(17, crc32(physical.slice(4, 17)));
  const chunks = [bytes.slice(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(
      bytes.buffer,
      bytes.byteOffset + offset,
      4,
    ).getUint32(0);
    if (offset + length + 12 > bytes.length)
      throw Error("Incomplete PNG chunk.");
    const kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (kind !== "pHYs") chunks.push(bytes.slice(offset, offset + length + 12));
    if (kind === "IHDR") {
      chunks.push(physical);
      inserted = true;
    }
    offset += length + 12;
  }
  if (!inserted || offset !== bytes.length) throw Error("Invalid PNG image.");
  return new Blob(chunks, { type: blob.type });
}
