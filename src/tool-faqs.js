import { guides } from "./tool-guides.js";
import { resizeFaqs } from "./photo-sizes.js";

// Shared by the visible FAQ sections and their structured data.
export const homeFaqs = [
  [
    "Is MyDocPro free to use?",
    "Yes. MyDocPro’s image and PDF tools are free, with no sign-up or watermark on downloads. File-size, page-count and processing limits still apply; check the limits shown by the selected tool.",
  ],
  [
    "Are my photos and PDFs uploaded to a server?",
    "No. File processing runs in your browser, and your photo and PDF data are not uploaded to a server. Download the finished result to save a copy on your device.",
  ],
  [
    "Can I use MyDocPro offline?",
    "Supported browsers can cache the tools after an online visit. Wait until the header says Works offline before disconnecting. Browser storage limits or clearing site data can remove the offline cache, so keep your original files and downloads separately.",
  ],
  [
    "Which tool should I use for a photo with dimensions and a KB limit?",
    "Use Resize image to set cm, mm, inches or pixels, choose DPI and enter an optional maximum KB size. The resizer keeps exact pixel dimensions. Use Compress image when smaller dimensions are acceptable to reach a small file-size target.",
  ],
];

export const calculatorFaqs = [
  [
    "How do I convert centimetres to pixels?",
    "Multiply centimetres by DPI and divide by 2.54. For example, 3.5 cm at 300 DPI is approximately 413 pixels. For millimetres divide by 25.4; for inches multiply directly by DPI. Pixel answers are rounded to whole pixels.",
  ],
  [
    "Why do I need DPI to convert pixels back to centimetres?",
    "Pixels alone do not specify a physical print size. Centimetres = pixels ÷ DPI × 2.54. For example, 600 pixels at 300 DPI is 5.08 cm, while the same 600 pixels at 200 DPI is 7.62 cm.",
  ],
  [
    "Is a 5 × 5 cm photo the same as 2 × 2 inches?",
    "No. Two inches equals 5.08 cm. At 300 DPI, a 5 × 5 cm photo rounds to 591 × 591 pixels, while a 2 × 2 inch photo is 600 × 600 pixels. Use the exact size requested by your destination.",
  ],
];

const extraFaqs = {
  "image-editor": [
    [
      "In what order should I edit an application photo?",
      "Crop and rotate first. Add a name and date strip only if required, then resize the complete photo. Compress near the end because later edits can change the file size. Check the downloaded result against your form’s instructions.",
    ],
    [
      "Can enlarging a photo recover missing detail?",
      "No. Increasing the dimensions adds pixels but cannot restore detail lost to blur or earlier compression. Start with the clearest original available and inspect facial features and text before downloading.",
    ],
  ],
  "pdf-toolkit": [
    [
      "Which PDF task should I choose?",
      "Use Merge to combine files, Split to extract pages, Organize to reorder or remove pages, Compress to reduce size, Image to PDF for photos, or PDF to image for page pictures. Edit pages lets you select, move and rotate pages across PDFs.",
    ],
    [
      "Does the PDF toolkit unlock password-protected files?",
      "No. Use an unlocked, valid PDF. If you are authorised to access a protected document, save an unprotected copy in your PDF app before selecting it here. Keep the original document separately.",
    ],
  ],
  "compress-image": [
    [
      "Can I compress a photo to 20 KB without changing its dimensions?",
      "This compressor may reduce pixel dimensions to keep a small JPEG clearer within the target. If exact dimensions are mandatory, use Resize image with its optional KB limit; it reports an error when the limit cannot be met at that size.",
    ],
    [
      "Why is the downloaded image below my maximum KB setting?",
      "The KB setting is an upper limit, not a request to pad the file. This tool counts 1 KB as 1,000 bytes and targets 3% below the maximum. A 50 KB setting therefore targets at most 48,500 bytes.",
    ],
  ],
  "convert-image": [
    [
      "Can I convert an image by changing its filename extension?",
      "No. Renaming a .png file to .jpg does not change its encoded format. Select the required output format in the converter, process the image and use the newly downloaded file.",
    ],
    [
      "Which format should I choose for a transparent image?",
      "Choose PNG or WebP when the destination supports transparency. JPG cannot store transparency and uses a white background. Check the output preview and the file types accepted by the receiving website.",
    ],
  ],
  "crop-image": [
    [
      "Does choosing a passport crop ratio set the final photo dimensions?",
      "No. A ratio sets the shape of the crop. After cropping, use Resize image to set the required cm, mm or pixel dimensions and DPI. Check the receiving authority’s current framing and size requirements separately.",
    ],
    [
      "How can I avoid cutting off important details?",
      "Rotate the photo upright first, then drag and resize the selection while checking the edges. Leave enough room around hair, shoulders, text or signature strokes. Crop zoom removes more of the surrounding image, so increase it gradually.",
    ],
  ],
  "merge-pdf": [
    [
      "How do I combine two PDF files for free?",
      "Choose both PDFs, check their page thumbnails and arrange the pages in the required order. Merge them and download the combined PDF without an account. For example, a two-page PDF and a three-page PDF should produce five pages if you keep every page. Open the download to confirm the order and page count.",
    ],
    [
      "Can I combine photos and PDFs in the same document?",
      "Yes. Add PDFs and supported images, then arrange their page thumbnails before merging. Each image becomes an A4 page with automatic orientation; existing PDF pages retain their page sizes.",
    ],
    [
      "Does merging PDFs also make them smaller?",
      "Not necessarily. Merging combines pages and does not guarantee a smaller file. If your destination sets a file-size limit, try Compress PDF afterward and check the final page count, readability and file size.",
    ],
  ],
  "split-pdf": [
    [
      "How do I extract selected PDF pages?",
      "Enter page positions separated by commas and ranges, such as 1-3, 8. That selection keeps four pages. The numbers refer to positions in the PDF, which may differ from printed page labels.",
    ],
    [
      "Can I download each PDF page as a separate file?",
      "Yes. Choose Separate PDF per page to export individual pages, or Split every N pages to create groups. Use the individual downloads or the ZIP download for multiple output files.",
    ],
  ],
  "compress-pdf": [
    [
      "Can every PDF be compressed to 100 KB?",
      "No. The result depends on the source document, its images and the detail that must remain readable. A size target starts an automatic search; if it cannot be reached, check the reported result rather than assuming the file meets the limit.",
    ],
    [
      "Why is there no compressed PDF to download?",
      "If processing does not produce a smaller file, the tool reports that the PDF is already small and does not offer a replacement download. Keep the original instead of adding a larger recompressed copy.",
    ],
  ],
  "jpg-to-pdf": [
    [
      "How do I merge JPG images into one PDF?",
      "Add your JPG images, arrange them in reading order and choose A4, Letter or Fit to image. Each image becomes one PDF page, so four JPGs produce four pages. Set margins and automatic or fixed orientation, then check the downloaded document before submitting it.",
    ],
    [
      "Will a photo converted to PDF have searchable text?",
      "No. This tool places images onto PDF pages; it does not perform optical character recognition. Text in a photographed receipt or scan remains part of the image rather than becoming selectable text.",
    ],
  ],
  "exam-photo": [
    [
      "Does a photo preset guarantee that my application will accept it?",
      "No. These are generic size presets. Check the form’s current rules for dimensions, background, framing, file type, KB limits and whether a live photo is required. A preset alone does not certify compliance.",
    ],
    [
      "What pixel dimensions does the 35 × 45 mm preset produce?",
      "At 300 DPI, 35 × 45 mm rounds to 413 × 531 pixels. DPI changes the calculated pixel dimensions, so use the setting required by your receiving form and check the final download.",
    ],
  ],
  signature: [
    [
      "How do I keep faint signature strokes visible?",
      "Start with a clear scan on plain white paper and adjust the White threshold gradually. Lower thresholds whiten more pixels and may erase faint ink. Compare thin strokes, dots and pen marks with the original at full size.",
    ],
    [
      "Can I resize a signature to the dimensions and KB limit on my form?",
      "Clean the scan here first, then use Crop image to remove excess paper and Resize image to set the required dimensions, DPI and optional maximum KB. This cleaner whitens the paper background; it does not make it transparent or set a fixed signature size. Check faint strokes after resizing.",
    ],
  ],
  "passport-sheet": [
    [
      "How do I make passport size photos for printing?",
      "Choose the intended photo size and paper size, then print at Actual size or 100%. Disable automatic fit or enlargement. Print a trial and measure one photo with a ruler before cutting the sheet.",
    ],
    [
      "Does changing the number of copies make each photo smaller?",
      "No. Individual photo dimensions stay fixed. If the requested copies do not fit on the selected paper, choose fewer copies or a larger sheet rather than expecting the photos to shrink automatically.",
    ],
  ],
  "pdf-to-image": [
    [
      "Which resolution should I choose to convert PDF to JPG?",
      "Start at 150 DPI for general viewing. Use 300 DPI when you need more detail and your device has enough memory. Higher DPI creates more pixels and can increase processing time and output size.",
    ],
    [
      "Will exported page images retain selectable text and links?",
      "No. Each exported page is a picture, so selectable PDF text and interactive links are not retained. Keep the original PDF when you need those features.",
    ],
  ],
  "organize-pdf": [
    [
      "How do I reorder pages using page numbers?",
      "Enter the source page positions in the order you want. For example, 3, 1, 2 places page three first. Omitting a page excludes it from the output. Inspect the thumbnails and the downloaded PDF to confirm the result.",
    ],
    [
      "Can I rotate a page without rotating the whole PDF?",
      "Yes. Use the page controls to adjust individual page rotation, then check the preview and download. Verify the orientation of every changed page and keep your source file separately.",
    ],
  ],
  "name-date": [
    [
      "Does adding a name and date change my photo’s dimensions?",
      "Yes. The tool adds a white text strip below the photo. If your form specifies exact final dimensions, resize the complete image afterward and recheck both the text readability and file size.",
    ],
    [
      "Which date format can I put below my photo?",
      "Choose DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD. Use the spelling and date required by the receiving form, and inspect the preview for long names that may need smaller text to fit.",
    ],
  ],
  "join-images": [
    [
      "Can I leave white space around Aadhaar front and back for A4 printing?",
      "Yes. Choose the Aadhaar front + back preset or A4 with white space, then adjust image width, margins and position. Check that both sides remain readable and print the A4 PDF at Actual size or 100%.",
    ],
    [
      "How many images can I join, and which layouts are available?",
      "Join two to six images in a vertical, horizontal or grid layout. Arrange their order and adjust spacing before downloading. Use separate files instead when your destination has separate upload fields.",
    ],
  ],
  "remove-background": [
    [
      "Is my photo uploaded when I remove the background?",
      "No. The segmentation model runs in your browser. The tool downloads the model and runtime from this site, but your photo is never sent to a server.",
    ],
    [
      "What kind of photo works best?",
      "A single, clearly visible person facing the camera, with even light and some contrast between hair and background. Group photos, pets, products and busy scenes may not cut out cleanly.",
    ],
    [
      "How do I fix rough or halo edges around hair?",
      "Raise Edge softness to blend fine hair, or lower Cutout size to trim a light halo. Always compare the result with the original at full size before submitting it.",
    ],
    [
      "Can I keep a transparent background?",
      "Yes. Choose Transparent and download PNG or WebP. JPG cannot store transparency, so JPG output uses a white background instead.",
    ],
  ],
  "white-background": [
    [
      "How can I make a photo background white?",
      "Choose a photo with a plain, light background reaching the image edges, then adjust Background tolerance and inspect the preview. Similar colours connected to the border are whitened. Patterned backgrounds and uneven shadows may not clean evenly because this is colour matching, not person segmentation.",
    ],
    [
      "Can I put the whitened photo on A4 with white space?",
      "Yes. Choose A4 with white space, set photo width, margins and position, then export an A4 PDF. Height follows the photo’s proportions. Print at Actual size or 100% and measure a trial copy.",
    ],
  ],
};

export function toolFaqs(id) {
  if (id === "resize-image") return resizeFaqs;
  if (!Object.hasOwn(extraFaqs, id) || !Object.hasOwn(guides, id)) return [];
  return [[guides[id][3], guides[id][4]], ...extraFaqs[id]];
}
