// Steps complement each tool's worked example and limitations in tool-guides.js.
export const guideDetails = {
  "compress-image": {
    steps: [
      "Add the JPG, PNG, WebP or HEIC photo you want to make smaller.",
      "To compress an image to 20 KB, select the 20 KB preset. For another limit, choose 50, 100 or 200 KB, or enter Maximum size (KB). Keep Maximum width (px) above any minimum width required by your form.",
      "Process the image, then download the JPG. For a batch, use Download all (ZIP) or an individual download and check each output separately.",
    ],
    checks:
      "Compare the downloaded JPG’s size with the upload limit and inspect fine details such as eyes and signature strokes. Compression may reduce dimensions, so check the output width and height too.",
    related: ["resize-image", "exam-photo", "convert-image"],
  },
  "convert-image": {
    steps: [
      "Choose a JPG, PNG, WebP, HEIC or HEIF source image.",
      "Select Output format to match the file types accepted by the website or app where you will use it.",
      "For JPG or WebP, choose the quality level; lowering it can reduce size while losing detail. The quality control does not change PNG compression.",
      "Process and download the converted file with its new extension.",
    ],
    checks:
      "Open the converted download and inspect small text and edges. PNG and WebP retain transparency; JPG uses a white background. Check the actual format and file size because changing formats does not guarantee a smaller file.",
    related: ["resize-image", "compress-image", "jpg-to-pdf"],
  },
  "crop-image": {
    steps: [
      "Choose your photo and rotate it upright before setting the final crop.",
      "To crop an image to a required shape, select a fixed Crop ratio. Choose Freeform when you need independent width and height rather than a locked shape.",
      "Move or resize the crop selection in the preview. Keep essential details away from the edges and use zoom carefully.",
      "Process the crop and download it. Use Resize image next if you also need exact centimetres or pixel dimensions.",
    ],
    checks:
      "Inspect the downloaded crop for clipped hair, shoulders, text or signature strokes. Confirm it is upright and has enough pixels for its destination; a crop ratio alone does not set a physical print size.",
    related: ["resize-image", "exam-photo", "white-background"],
  },
  "merge-pdf": {
    steps: [
      "Add at least two PDFs or images and wait for their page previews to load. Each image becomes an A4 page with automatic orientation.",
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
      "Enter Pages to extract with commas and ranges, such as 1-3, 8. A reversed range such as 5-2 keeps that reverse order.",
      "To split PDF pages into individual files, choose Separate PDF per page. Choose One PDF for one selected-page document, or Split every N pages for equal-sized groups and a shorter final group if needed.",
      "Check the selected page range, process it, then download all files as ZIP or choose individual outputs.",
    ],
    checks:
      "For 1-3, 8, expect four selected pages. Open the download or individual files and confirm their contents and order, using file positions rather than printed page labels.",
    related: ["organize-pdf", "merge-pdf", "pdf-to-image"],
  },
  "compress-pdf": {
    steps: [
      "Choose a PDF and keep an untouched original.",
      "To try compressing a PDF to 100 KB, select the 100 KB target. Other presets cover 200 KB, 500 KB and 1 MB. A target searches quality and resolution automatically; leave it blank to set DPI and quality manually.",
      "Process the file. Supported embedded images are recompressed while retaining real text; image-only documents may use a rendered-page fallback.",
      "Download the smaller result and inspect it. If no smaller file can be produced, keep the original; if the target is missed, check the reported output size.",
    ],
    checks:
      "Inspect small text, stamps and signatures. Compare page count, selectable text and file size with the original. Check links or form fields if those matter; keep signed originals because editing can invalidate their signatures.",
    related: ["split-pdf", "pdf-to-image", "merge-pdf"],
  },
  "jpg-to-pdf": {
    steps: [
      "Add the JPG, PNG, WebP or HEIC images that belong in the document.",
      "To merge JPG images into one PDF, arrange them in reading order. Each image becomes one PDF page; for example, three JPGs produce three pages.",
      "Choose A4, Letter or Fit to image, set margins, and use Auto orientation per image or force portrait or landscape.",
      "Set image quality and optionally a maximum PDF size, then create the PDF and check any size warning before downloading.",
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
      "Download the cleaned signature. Use Crop image to remove excess paper, then Resize image for required pixel dimensions, cm or mm and an optional KB limit. This cleaner does not set those dimensions itself.",
    ],
    checks:
      "Compare the download with the original at full size. Check thin strokes, dots and faint ink for accidental removal; the cleaned background is white, not transparent.",
    related: ["crop-image", "resize-image", "join-images"],
  },
  "passport-sheet": {
    steps: [
      "To make passport size photos for printing, start with a clear photo and check the receiving authority’s current size and framing requirements. This sheet maker arranges copies; it does not certify passport compliance.",
      "Choose the required photo size: 35 × 45 mm, 2 × 2 inches, 25 × 35 mm or 20 × 25 mm stamp.",
      "Select 4 × 6 inch or A4 paper, DPI, copy count and optional cut guides. Choose fewer copies if they do not fit.",
      "Download and print on the selected paper at actual size, with automatic fit or enlargement disabled.",
    ],
    checks:
      "Print a trial and measure an individual photo with a ruler before cutting. Photo dimensions stay fixed when copy count changes. Check face framing, margins and print quality before using the sheet.",
    related: ["exam-photo", "crop-image", "resize-image"],
  },
  "pdf-to-image": {
    steps: [
      "To convert PDF to JPG, add one PDF and select JPG as the output format. Choose PNG or WebP instead only when the receiving site accepts that format.",
      "Enter all or a page selection such as 1-3, 5, using positions in the PDF.",
      "Start at 150 DPI for general viewing. Optionally set Max size per image (KB); this can reduce quality or dimensions to fit.",
      "Render the selection and download all images as ZIP, or choose the individual page downloads.",
    ],
    checks:
      "Count the exported images against your selected pages and inspect small text at full size. Check the actual image dimensions and format, and save completed outputs before processing another range.",
    related: ["split-pdf", "jpg-to-pdf", "compress-image"],
  },
  "organize-pdf": {
    steps: [
      "Add a PDF and wait for its thumbnails to load.",
      "Reorder or remove pages using the controls, or enter their positions in Pages in output order, such as 3, 1, 2.",
      "Use each page card’s Rotate button to turn that page, or apply the shared Rotation setting to all selected pages.",
      "Download the organized PDF under a new filename so the original remains available.",
    ],
    checks:
      "Open the downloaded PDF and confirm its page count, reading order and orientation. If you omitted pages, verify the intended pages are absent and that no required cover or attachment was removed.",
    related: ["split-pdf", "merge-pdf", "pdf-to-image"],
  },
  "name-date": {
    steps: [
      "Check that the receiving form permits or requires a name and date strip, then choose your photo.",
      "Enter the name and date, then select DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD.",
      "Inspect the strip below the photo, especially the spelling and the fit of a long name.",
      "Optionally set Max size (KB), then process and download. Resize the complete image afterward if fixed final dimensions are required, and recheck its size.",
    ],
    checks:
      "Open the download and read the name and date at its intended display size. Check the overall dimensions after the strip is added, and recheck text readability after any resizing or compression.",
    related: ["resize-image", "compress-image", "exam-photo"],
  },
  "join-images": {
    steps: [
      "Choose two to six images and arrange Image 1, Image 2 and the remaining files in reading order.",
      "Crop excess margins first. For a front-and-back pair, choose the Aadhaar front + back preset when it matches your intended layout.",
      "Choose vertical, horizontal or grid layout, then set spacing between images.",
      "Export JPG or a single A4 PDF page and check that every image remains readable at the final size.",
    ],
    checks:
      "Confirm that every image appears in the intended order with no cropped details. Check that the receiving form accepts a combined JPG or PDF rather than separate uploads.",
    related: ["signature", "crop-image", "resize-image"],
  },
  "white-background": {
    steps: [
      "Choose an image whose plain background reaches the outer edges; patterned or strongly shadowed backgrounds may not clean evenly.",
      "Adjust Background tolerance gradually while inspecting the preview. The fill starts at the border and follows similar colours.",
      "Lower tolerance if subject details connected to the background are affected; raise it cautiously to include more background shades.",
      "Choose an accepted output format, process and download the result.",
    ],
    checks:
      "Compare the downloaded image with the original, especially pale clothing, skin highlights and light ink. Check for remaining shadows and erased details; the tool whitens pixels and does not create a transparent cutout.",
    related: ["crop-image", "signature", "exam-photo"],
  },
};
