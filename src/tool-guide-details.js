// Steps complement each tool's worked example and limitations in tool-guides.js.
export const guideDetails = {
  "compress-image": {
    steps: [
      "Add the JPG, PNG or WebP photo you want to make smaller.",
      "Enter Maximum size (KB) and a Maximum width (px) that still meets the receiving form’s minimum dimensions.",
      "Process the image, then download the JPG result. For several selected images, check each output separately.",
    ],
    checks:
      "Compare the downloaded JPG’s size with the upload limit and inspect fine details such as eyes and signature strokes. Compression may reduce dimensions, so check the output width and height too.",
    related: ["resize-image", "exam-photo", "convert-image"],
  },
  "convert-image": {
    steps: [
      "Choose a supported JPG, PNG or WebP source image.",
      "Select Output format to match the file types accepted by the website or app where you will use it.",
      "For JPG or WebP, choose the quality level; lowering it can reduce size while losing detail. The quality control does not change PNG compression.",
      "Process and download the converted file with its new extension.",
    ],
    checks:
      "Open the converted download and inspect small text, edges and any formerly transparent areas. Check both the actual output format and file size; changing formats does not guarantee a smaller file.",
    related: ["resize-image", "compress-image", "jpg-to-pdf"],
  },
  "crop-image": {
    steps: [
      "Choose your photo and rotate it upright before setting the final crop.",
      "Select a fixed Crop ratio for a required shape, or Freeform for an unconstrained selection.",
      "Move or resize the crop selection in the preview. Keep essential details away from the edges and use zoom carefully.",
      "Process the crop and download it. Use Resize image next if you also need exact centimetres or pixel dimensions.",
    ],
    checks:
      "Inspect the downloaded crop for clipped hair, shoulders, text or signature strokes. Confirm it is upright and has enough pixels for its destination; a crop ratio alone does not set a physical print size.",
    related: ["resize-image", "exam-photo", "white-background"],
  },
  "merge-pdf": {
    steps: [
      "Add at least two PDF files and wait for their page previews to load.",
      "Arrange the documents and pages in the order you want them to appear in the combined PDF.",
      "Check the preview sequence and choose an output filename that distinguishes the bundle from its originals.",
      "Merge the files and download the combined PDF.",
    ],
    checks:
      "Open the downloaded PDF and count its pages against your intended selection. Inspect document boundaries, page orientation and small text; retain the source PDFs if forms or digital signatures matter.",
    related: ["organize-pdf", "split-pdf", "compress-pdf"],
  },
  "split-pdf": {
    steps: [
      "Add one PDF and identify the positions of the pages you want to keep.",
      "Enter Pages to extract with commas and ascending ranges, such as 1-3, 8.",
      "Choose One PDF to combine the selection or Separate PDF per page for individual files.",
      "Process the selection and download every output you need.",
    ],
    checks:
      "For 1-3, 8, expect four selected pages. Open the download or individual files and confirm their contents and order, using file positions rather than printed page labels.",
    related: ["organize-pdf", "merge-pdf", "pdf-to-image"],
  },
  "compress-pdf": {
    steps: [
      "Choose a PDF whose pages can be converted to images; keep an untouched original.",
      "Start with Render resolution (DPI) at 110 and JPEG quality at 65.",
      "Process and download the new PDF, then compare its size and readability with the source.",
      "If necessary, lower DPI or quality gradually and retry from the original, keeping small text readable.",
    ],
    checks:
      "Inspect the smallest text, stamps and signatures in the downloaded PDF. Compare page count and file size, and confirm that image-only output is acceptable before replacing a searchable or interactive document.",
    related: ["split-pdf", "pdf-to-image", "merge-pdf"],
  },
  "jpg-to-pdf": {
    steps: [
      "Add the JPG, PNG or WebP images that belong in the document.",
      "Arrange the images in reading order; each image becomes one PDF page.",
      "Choose A4, Letter or Fit to image. For A4 or Letter, select a suitable portrait or landscape orientation.",
      "Create the PDF and download it with a descriptive filename.",
    ],
    checks:
      "Check that the downloaded PDF has one page per selected image, in the intended order. Zoom in on receipt totals, dates and small print, and check for excessive blank margins or sideways pages.",
    related: ["crop-image", "compress-image", "merge-pdf"],
  },
  "exam-photo": {
    steps: [
      "Read the receiving form’s current requirements before choosing a generic photo preset.",
      "Add your photo and choose 35 × 45 mm, 2 × 2 inches or 25 × 35 mm only when that matches the requested size.",
      "Set DPI and Maximum size (KB) to the permitted values, then check the centre-cropped framing.",
      "Process and download the JPG. If the target cannot be reached, adjust settings only within the form’s requirements.",
    ],
    checks:
      "Verify the download’s pixel dimensions, file size and face framing. Confirm background and photo rules separately: choosing a preset does not certify compliance or acceptance.",
    related: ["crop-image", "resize-image", "passport-sheet"],
  },
  signature: {
    steps: [
      "Choose a clear scan or photo of a signature on white paper, with as little shadow as possible.",
      "Adjust White threshold while watching the preview; start around 170 and change it gradually.",
      "Choose the output format accepted by the receiving form.",
      "Process and download the cleaned image, then crop or resize it if the destination requires a smaller signature area.",
    ],
    checks:
      "Compare the download with the original at full size. Check thin strokes, dots and faint ink for accidental removal; the cleaned background is white, not transparent.",
    related: ["crop-image", "resize-image", "join-images"],
  },
  "passport-sheet": {
    steps: [
      "Choose a photo with suitable framing and check the receiving authority’s photo requirements.",
      "Select four, six or eight copies. Use four or six when you need the larger approximately 35 × 45 mm photo areas.",
      "Create and download the 1,200 × 1,800 pixel sheet.",
      "Print on 4 × 6 inch paper at actual size, with automatic fit or enlargement disabled.",
    ],
    checks:
      "Print a trial and measure an individual photo with a ruler before cutting the sheet. Check face framing and print quality; eight copies use smaller photo areas than four or six.",
    related: ["exam-photo", "crop-image", "resize-image"],
  },
  "pdf-to-image": {
    steps: [
      "Add one PDF and select JPG, PNG or WebP as the output format.",
      "Enter all or a page selection such as 1-3, 5, using positions in the PDF.",
      "Start at 150 DPI for general viewing, increasing resolution only when the extra detail is needed.",
      "Render the selection and download the image for each required page.",
    ],
    checks:
      "Count the exported images against your selected pages and inspect small text at full size. Check the actual image dimensions and format, and save completed outputs before processing another range.",
    related: ["split-pdf", "jpg-to-pdf", "compress-image"],
  },
  "organize-pdf": {
    steps: [
      "Add a PDF and wait for its thumbnails to load.",
      "Reorder or remove pages using the controls, or enter their positions in Pages in output order, such as 3, 1, 2.",
      "Apply rotation where needed and inspect the resulting page sequence before processing.",
      "Download the organized PDF under a new filename so the original remains available.",
    ],
    checks:
      "Open the downloaded PDF and confirm its page count, reading order and orientation. If you omitted pages, verify the intended pages are absent and that no required cover or attachment was removed.",
    related: ["split-pdf", "merge-pdf", "pdf-to-image"],
  },
  "name-date": {
    steps: [
      "Check that the receiving form permits or requires a name and date strip, then choose your photo.",
      "Enter the name exactly as required and choose the requested date.",
      "Inspect the strip below the photo, especially the spelling and the fit of a long name.",
      "Process and download the result; resize the complete image afterward if fixed final dimensions are required.",
    ],
    checks:
      "Open the download and read the name and date at its intended display size. Check the overall dimensions after the strip is added, and recheck text readability after any resizing or compression.",
    related: ["resize-image", "compress-image", "exam-photo"],
  },
  "join-images": {
    steps: [
      "Choose exactly two images, placing the photo first and the signature second.",
      "Crop excess white margins from the signature beforehand if they would make the combined image too tall or wide.",
      "Select Photo above signature for a vertical arrangement or Side by side for a horizontal arrangement.",
      "Process and download the combined image, then resize it if the receiving form specifies final dimensions.",
    ],
    checks:
      "Confirm that both images appear in the intended order and that the signature is readable at the final size. Check that the receiving form wants one combined file rather than two separate uploads.",
    related: ["signature", "crop-image", "resize-image"],
  },
  "white-background": {
    steps: [
      "Choose an image with a plain, light background; a patterned or strongly shadowed background may not clean evenly.",
      "Start White threshold near 225 and adjust gradually while inspecting the preview.",
      "Increase the threshold if bright subject details disappear; lower it only when you can keep those details intact.",
      "Choose an accepted output format, process and download the result.",
    ],
    checks:
      "Compare the downloaded image with the original, especially pale clothing, skin highlights and light ink. Check for remaining shadows and erased details; the tool whitens pixels and does not create a transparent cutout.",
    related: ["crop-image", "signature", "exam-photo"],
  },
};
