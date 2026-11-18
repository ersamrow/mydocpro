export function formatExamFileRange({ minKB, maxKB, maxExclusive }) {
  if (maxExclusive && maxKB != null)
    return minKB == null
      ? `Under ${maxKB} KB`
      : `${minKB} KB to under ${maxKB} KB`;
  if (minKB != null && maxKB != null) return `${minKB}–${maxKB} KB`;
  if (maxKB != null) return `Up to ${maxKB} KB`;
  if (minKB != null) return `At least ${minKB} KB`;
  return "See official notice";
}

export function formatExamDimensions(doc) {
  const dimensions = [];
  if (doc.widthPx && doc.heightPx)
    dimensions.push(`${doc.widthPx} × ${doc.heightPx} px`);
  if (doc.minWidthPx && doc.minHeightPx && doc.maxWidthPx && doc.maxHeightPx)
    dimensions.push(
      `${doc.minWidthPx}–${doc.maxWidthPx} px wide × ${doc.minHeightPx}–${doc.maxHeightPx} px high`,
    );
  else if (doc.minWidthPx && doc.minHeightPx)
    dimensions.push(`At least ${doc.minWidthPx} × ${doc.minHeightPx} px`);
  if (doc.physicalSize) dimensions.push(doc.physicalSize);
  if (doc.dimensionsNote) dimensions.push(doc.dimensionsNote);
  return dimensions.length ? dimensions : ["See official notice"];
}
