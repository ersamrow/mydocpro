// Physical dimensions are references, not guarantees of application acceptance.
export const photoSizes = [
  {
    slug: "3-5x4-5-cm",
    width: 3.5,
    height: 4.5,
    label: "3.5 × 4.5 cm",
    framing:
      "This portrait shape is slightly wider than a 3:4 camera photo. Fill removes a little from the top and bottom, so check hair and shoulders before saving. A crop ratio alone does not establish the head size required by an application.",
  },
  {
    slug: "2x2-5-cm",
    width: 2,
    height: 2.5,
    label: "2 × 2.5 cm",
    framing:
      "This small portrait uses a 4:5 ratio. Keep the subject large enough to recognise at a 2 cm printed width, while leaving any space required around the head. Inspect the downloaded image at its actual pixel size instead of judging only an enlarged preview.",
  },
  {
    slug: "2x4-5-cm",
    width: 2,
    height: 4.5,
    label: "2 × 4.5 cm",
    framing:
      "This is a narrow portrait, not the more common 3.5 × 4.5 cm shape. Fill can remove a substantial part of the left and right edges of a camera photo. Use Fit inside if keeping those edges matters, and confirm that the resulting white padding is allowed.",
  },
  {
    slug: "2-5x3-5-cm",
    width: 2.5,
    height: 3.5,
    label: "2.5 × 3.5 cm",
    framing:
      "The 5:7 portrait ratio is a little narrower than a 3:4 camera photo. Check both side edges after the centre crop. The PAN reference here sets only the image dimensions; background, framing and upload limits must come from your current application instructions.",
    note: "PAN card photo size reference: use this only if your current application asks for 2.5 × 3.5 cm. Check the official instructions for framing and KB limits.",
  },
  {
    slug: "5x5-cm",
    width: 5,
    height: 5,
    label: "5 × 5 cm",
    framing:
      "A square crop removes the top and bottom of a portrait photo. Leave room above the hair before choosing Fill. If the instructions specify two inches, change both dimensions to 5.08 cm rather than using this 5 cm preset.",
    note: "5 × 5 cm is not exactly 2 × 2 inches. Two inches is 5.08 cm, giving 600 × 600 pixels at 300 DPI; 5 cm gives 591 × 591 pixels. Use the exact dimensions your form requests.",
  },
  {
    slug: "4x6-cm",
    width: 4,
    height: 6,
    label: "4 × 6 cm",
    framing:
      "This is a 2:3 portrait measuring four by six centimetres, not a 4 × 6 inch print. A 3:4 source loses some width with Fill. Check details near the side edges; use the passport sheet tool if you need repeated copies arranged on paper.",
  },
  {
    slug: "3x4-cm",
    width: 3,
    height: 4,
    label: "3 × 4 cm",
    framing:
      "A portrait camera photo already in a 3:4 ratio can fit this shape without cropping. Other source ratios still need a crop or padding. Matching the shape does not guarantee enough resolution: enlarging a small source cannot recover facial detail.",
  },
  {
    slug: "4-5x3-5-cm",
    width: 4.5,
    height: 3.5,
    label: "4.5 × 3.5 cm",
    framing:
      "This preset is landscape: width is 4.5 cm and height is 3.5 cm. It is not interchangeable with the upright 3.5 × 4.5 cm preset. Rotate an incorrectly oriented source before resizing; Stretch would distort it rather than rotate it.",
  },
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
