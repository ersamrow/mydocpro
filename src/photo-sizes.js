// Physical dimensions are references, not guarantees of application acceptance.
export const photoSizes = [
  { slug: "3-5x4-5-cm", width: 3.5, height: 4.5, label: "3.5 × 4.5 cm" },
  { slug: "2x2-5-cm", width: 2, height: 2.5, label: "2 × 2.5 cm" },
  { slug: "2x4-5-cm", width: 2, height: 4.5, label: "2 × 4.5 cm" },
  {
    slug: "2-5x3-5-cm",
    width: 2.5,
    height: 3.5,
    label: "2.5 × 3.5 cm",
    note: "PAN card photo size reference: use this only if your current application asks for 2.5 × 3.5 cm. Check the official instructions for framing and KB limits.",
  },
  {
    slug: "5x5-cm",
    width: 5,
    height: 5,
    label: "5 × 5 cm",
    note: "5 × 5 cm is not exactly 2 × 2 inches. Two inches is 5.08 cm, giving 600 × 600 pixels at 300 DPI; 5 cm gives 591 × 591 pixels. Use the exact dimensions your form requests.",
  },
  { slug: "4x6-cm", width: 4, height: 6, label: "4 × 6 cm" },
  { slug: "3x4-cm", width: 3, height: 4, label: "3 × 4 cm" },
  { slug: "4-5x3-5-cm", width: 4.5, height: 3.5, label: "4.5 × 3.5 cm" },
];
export function sizePixels(size, dpi = 300) {
  return [size.width, size.height].map((cm) => Math.round((cm / 2.54) * dpi));
}
export function sizeSettings(size) {
  return {
    width: String(size.width),
    height: String(size.height),
    unit: "cm",
    dpi: "300",
    fit: "cover",
    keepProportions: false,
  };
}
export const resizeFaqs = [
  [
    "How do I resize a photo in cm?",
    "Choose centimetres, enter width and height, then choose DPI. Select Fill for a centre crop or Fit inside for white padding. Preview and download the result.",
  ],
  [
    "How many pixels is a 3.5 × 4.5 cm photo?",
    "At 300 DPI it is 413 × 531 pixels; at 200 DPI it is 276 × 354 pixels. Pixels are rounded from centimetres ÷ 2.54 × DPI.",
  ],
  [
    "Can I set dimensions and a KB limit together?",
    "Yes. Set dimensions and DPI, then enter Max size (KB, optional). Exact pixel dimensions stay fixed. If the selected format cannot meet the limit, the resizer reports an error.",
  ],
  [
    "Are my photos uploaded, and is resizing free?",
    "Resizing is free, with no sign-up or watermark. Image processing runs in your browser; your photo files are not uploaded to a server.",
  ],
];
export function sizeFaqs(size) {
  return [
    [
      `How many pixels is ${size.label}?`,
      `At 300 DPI, ${size.label} is ${sizePixels(size).join(" × ")} pixels. At 200 DPI it is ${sizePixels(size, 200).join(" × ")} pixels. These values are rounded to whole pixels.`,
    ],
    [
      `How do I make a ${size.label} photo?`,
      `Upload your photo. The tool starts at ${size.label}, centimetres, 300 DPI and Fill (centre crop). Check the framing, choose a format and download. You can change these settings if your destination requires different values.`,
    ],
    [
      "Can I also set a maximum file size?",
      "Yes. Use Max size (KB, optional). The resizer preserves the selected pixel dimensions and reports an error if the limit cannot be reached. Try a permitted format or a larger allowed limit.",
    ],
    [
      "Will this photo be accepted by my application?",
      size.note ||
        "A size preset does not certify acceptance. Check the destination’s current rules for dimensions, DPI, background, framing and KB limits before submitting. Print at Actual size (100%) and measure a trial copy.",
    ],
  ];
}
export function faqSchema(faqs) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    })),
  };
}
