// Uncompressed ZIP: JPEG/PNG/PDF data is already compressed. Avoid a second large encoding pass.
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
export async function zipOutputs(outputs) {
  const parts = [],
    central = [];
  let offset = 0,
    total = 0;
  const used = new Set();
  for (const [i, result] of outputs.entries()) {
    total += result.blob.size;
    if (total > 200 * 1048576)
      throw Error("ZIP is too large. Download the files individually.");
    let name = result.name.replace(/[\\/]/g, "_");
    if (used.has(name)) name = `${i + 1}-${name}`;
    while (used.has(name)) name = "_" + name;
    used.add(name);
    const filename = new TextEncoder().encode(name),
      data = new Uint8Array(await result.blob.arrayBuffer()),
      crc = crc32(data);
    const header = new Uint8Array(30 + filename.length),
      view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x800, true);
    view.setUint16(12, 33, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, filename.length, true);
    header.set(filename, 30);
    const directory = new Uint8Array(46 + filename.length),
      d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x800, true);
    d.setUint16(14, 33, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, data.length, true);
    d.setUint32(24, data.length, true);
    d.setUint16(28, filename.length, true);
    d.setUint32(42, offset, true);
    directory.set(filename, 46);
    parts.push(header, data);
    central.push(directory);
    offset += header.length + data.length;
    await new Promise((r) => setTimeout(r, 0));
  }
  const length = central.reduce((sum, b) => sum + b.length, 0),
    end = new Uint8Array(22),
    v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, outputs.length, true);
  v.setUint16(10, outputs.length, true);
  v.setUint32(12, length, true);
  v.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
