// These records describe the named application cycles. Recheck the linked notice
// before reusing a preset for a later cycle, especially its live-capture rules.
const lastVerified = "2026-11";
const jpg = (type, label, minKB, maxKB, rules, options = {}) => ({
  type,
  label,
  format: "JPG",
  minKB,
  maxKB,
  rules,
  ...options,
});
const faq = (question, answer) => ({ question, answer });
const source = (label, url) => ({ label, url });
const privateFiles = faq(
  "Where are my files processed?",
  "MyDocPro resizes the file in your browser for free. Download the result to your device and submit it yourself through the official application.",
);
const preferred = {
  dimensionsNote: "Preferred export dimensions in the PO/MT XVI notice.",
};

export const exams = [
  {
    slug: "neet-ug",
    name: "National Eligibility cum Entrance Test (Undergraduate)",
    shortName: "NEET UG",
    conductingBody: "National Testing Agency (NTA)",
    officialSite: "https://neet.nta.nic.in",
    lastVerified,
    title: "NEET UG 2026 Photo & Signature Size – Resize Free | MyDocPro",
    metaDescription:
      "Prepare JPGs of your passport photo, signature and hand impressions for NEET UG 2026. Check the file sizes privately before uploading them to NTA.",
    h1: "NEET UG Photo, Signature & Thumb Resizer",
    intro:
      "Prepare the three scanned images for the 2026 form. NTA also takes a separate live photograph during registration.",
    documents: [
      jpg("photo", "Passport photo", 10, 200, [
        "Use your own recent photo taken on or after 1 January 2026, against white.",
        "Your face should fill about 80% of the frame, with both ears visible and your mask removed.",
        "Wear spectacles only if you regularly use them. Use a camera photograph without digital reconstruction or Polaroid processing.",
      ]),
      jpg("signature", "Signature", 10, 100, [
        "Sign in your own handwriting on white paper with a dark pen.",
        "Use your usual signature and keep every stroke clearly readable.",
      ]),
      // TODO: Check for a later NTA clarification. pp. 16 and 17 give
      // different limits; the export preset uses their intersection.
      jpg(
        "impressions",
        "Fingers and thumbs of both hands",
        50,
        200,
        [
          "Include the required fingers and thumb impressions from both hands in the prescribed layout.",
          "Keep the ridges visible. Confirm the size limit beside the upload field.",
        ],
        {
          rangeNote:
            "Safe export range. The general checklist gives 10–200 KB and the detailed impression instructions give 50–300 KB.",
        },
      ),
    ],
    livePhoto: {
      required: true,
      note: "NTA compares the live image with the photograph in the Aadhaar database. Prepare the separate passport JPG above as well.",
      tips: [
        "Use the portal webcam or its mobile capture option in even light against a white background.",
        "Look straight ahead, keep both ears visible, and remove anything covering your face.",
      ],
    },
    steps: [
      "Choose the passport photo, signature or hand-impressions preset.",
      "Open the original scan. Keep the whole face, signature or impression sheet inside the crop.",
      "Export the JPG and read the size check. Enlarge the preview to check fine pen strokes and ridges.",
      "Download and select the file in its matching NTA field. Complete the live photo step separately.",
    ],
    rejectionReasons: [
      "A cropped ear, mask, or artificially altered face obscures the photograph.",
      "Fingers are cut off, the wrong hand is shown, or ridges have merged into a dark patch.",
      "The signature or impression sheet is selected in the passport-photo field.",
    ],
    faqs: [
      faq(
        "What is the NEET UG passport photo size?",
        "The 2026 checklist asks for a JPG from 10 to 200 KB. Use a recent white-background portrait with the ears visible.",
      ),
      faq(
        "Does NEET still need an uploaded photo?",
        "Yes. You submit the saved passport photo and take another photo live in the NTA application.",
      ),
      faq(
        "Why does the impression preset target 50–200 KB?",
        "The upload checklist and the detailed impression instructions in the 2026 bulletin give different ranges. A 50–200 KB JPG fits both. Check the limits shown beside your upload field.",
      ),
      faq(
        "Can I prepare all the impressions in a single scan?",
        "Follow the NTA impression-sheet layout for both hands. Scan the completed sheet with the finger and thumb ridges visible and inspect it again after compression.",
      ),
      faq(
        "Which photos should I keep for later?",
        "Keep the same portrait for attendance and counselling. NTA advises keeping 6–8 passport prints and 4–6 postcard prints measuring 4 × 6 inches.",
      ),
      privateFiles,
    ],
    sources: [
      source(
        "NTA 2026 information bulletin, application instructions",
        "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602231394640855.pdf#page=21",
      ),
    ],
  },
  {
    slug: "jee-main",
    name: "Joint Entrance Examination (Main)",
    shortName: "JEE Main",
    conductingBody: "National Testing Agency (NTA)",
    officialSite: "https://jeemain.nta.nic.in",
    lastVerified,
    title: "JEE Main 2027 Photo & Signature Size – Resize Free | MyDocPro",
    metaDescription:
      "Resize photo (10–200KB) and signature (10–100KB) for JEE Main 2027 in JPG format. Free, no sign-up, no upload.",
    h1: "JEE Main Photo & Signature Resizer",
    intro:
      "Prepare your scanned passport photo and signature for JEE Main 2027, then complete the live camera step in the NTA form.",
    documents: [
      // TODO: The 2027 upload checklist does not specify a 3.5 × 4.5 cm size.
      jpg("photo", "Passport photo", 10, 200, [
        "Choose a recent colour passport portrait with a white background.",
        "Show about 80% face, including the ears. Keep your face uncovered and retain its natural appearance.",
      ]),
      jpg("signature", "Signature", 10, 100, [
        "Scan your own handwritten signature clearly. Plain white paper and dark ink help the strokes remain readable.",
      ]),
    ],
    livePhoto: {
      required: true,
      note: "The JEE Main 2027 bulletin asks for a live image during registration as well as a saved passport JPG.",
      tips: [
        "Use the webcam on the device filling out the form, or scan NTA’s QR code with a phone or tablet.",
        "Use a white background and even light. Centre your face with ears visible and remove your mask.",
      ],
    },
    steps: [
      "Select Photo or Signature and open the corresponding original image.",
      "For a portrait, keep the ears and outline of the face within the frame. For a signature, leave room around the outer strokes.",
      "Export and check the JPG size and the clarity of the preview.",
      "Download each file and select it in the matching field. Follow NTA’s live photo prompt in the form.",
    ],
    rejectionReasons: [
      "The face blends into a dark background or the crop cuts off an ear.",
      "The signature is too faint to read after compression.",
      "A saved image is supplied in place of the portal’s required live capture.",
    ],
    faqs: [
      faq(
        "What photo size does JEE Main 2027 require?",
        "The NTA checklist specifies a recent colour passport JPG from 10 to 200 KB. Use a white background and keep the ears visible.",
      ),
      faq(
        "Does the 2027 bulletin specify an exact photo width?",
        "Its upload checklist specifies the file size and facial framing. The preset preserves the crop you choose without imposing an unverified print size.",
      ),
      faq(
        "What is the signature size?",
        "Export a clearly readable scan of your signature as a 10–100 KB JPG.",
      ),
      faq(
        "Can I use my phone for the live photo?",
        "Yes. The bulletin describes a QR code that opens the capture step on a mobile device when a webcam is unavailable.",
      ),
      privateFiles,
    ],
    sources: [
      source(
        "NTA JEE Main 2027 information bulletin, pages 8–9",
        "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2026/10/202610241890224107.pdf#page=9",
      ),
    ],
  },
  {
    slug: "upsc",
    name: "UPSC Civil Services Examination",
    shortName: "UPSC",
    conductingBody: "Union Public Service Commission (UPSC)",
    officialSite: "https://upsconline.nic.in",
    lastVerified,
    title: "UPSC Photo & 3-Signature Size 2026 – Resize Free | MyDocPro",
    metaDescription:
      "Resize your UPSC photo (20–200KB) and triple signature (20–100KB) in JPG. Free, private, works on mobile. Files never leave your device.",
    h1: "UPSC Photo & Signature Resizer",
    intro:
      "Prepare the two image files for the 2026 Civil Services Common Application Form, including a single scan of three handwritten signatures.",
    documents: [
      jpg(
        "photo",
        "Photo",
        20,
        200,
        [
          "Take a front-facing colour photo against plain white. Keep both ears visible and fill about three quarters of the frame with your face.",
          "Avoid shadows and glare. Keep the face clear of writing or digital alterations.",
          "Save the file as photo.jpg for the common application.",
        ],
        { filename: "photo.jpg" },
      ),
      jpg(
        "signature",
        "UPSC triple signature",
        20,
        100,
        [
          "Sign three times with black ink on plain white paper, one below the next. Scan the sheet as one image.",
          "Leave space between signatures and keep all three legible. Save the file as signature.jpg.",
        ],
        {
          signatureRows: 3,
          filename: "signature.jpg",
          minWidthPx: 350,
          minHeightPx: 350,
          maxWidthPx: 500,
          maxHeightPx: 500,
          dimensionsNote:
            "The upload guide specifies 350–500 pixels. The preset keeps both sides within that range.",
        },
      ),
    ],
    livePhoto: {
      required: true,
      note: "The Civil Services Common Application Form asks for both the saved photo and a live image. Use the same appearance in both.",
      tips: [
        "Sit facing the camera with a plain white background and light falling on your face.",
        "Keep your eyes and ears visible. Check for glare before capturing the photo.",
      ],
    },
    steps: [
      "Select Photo for the portrait or UPSC triple signature for your signed sheet.",
      "For the signature, write all three lines on the same paper and scan the whole group.",
      "Frame the three originals with the vertical guide, then export a JPG.",
      "Review the preview and output size. Use the required filename and complete the separate live capture on UPSC’s portal.",
    ],
    rejectionReasons: [
      "Only one signature appears, or the first or last line is clipped.",
      "The signature sheet has shadows or faint strokes after resizing.",
      "The saved portrait obscures part of the face or differs substantially from the live appearance.",
    ],
    faqs: [
      faq(
        "How many signatures does UPSC CSE 2026 ask for?",
        "Sign your name three times by hand on a single white sheet, in a vertical column. Photograph or scan the group together.",
      ),
      faq(
        "Can I copy one signature three times?",
        "Make three separate signatures on paper. The guide helps you frame the three originals for one upload.",
      ),
      faq(
        "What size should the UPSC signature be?",
        "The upload guide gives 20–100 KB and 350–500 pixels. This preset keeps both image dimensions within that pixel range.",
      ),
      faq(
        "Which UPSC photo do I upload?",
        "Use a clearly framed JPG from 20 to 200 KB for the saved photo. UPSC also captures a live photo during the Common Application Form.",
      ),
      faq(
        "Does this cover every UPSC recruitment?",
        "These presets follow the 2026 Civil Services notice and the common portal instructions. Check the notification issued for your examination before using the same settings.",
      ),
      privateFiles,
    ],
    sources: [
      source(
        "UPSC CSE 2026 notification, photography and signature notes",
        "https://www.upsc.gov.in/sites/default/files/Notif-CSP-2026-Engl-060226Rev.pdf",
      ),
      source(
        "UPSC instructions for photo and signature uploads",
        "https://upsconline.nic.in/ngrp/assets/PDF/instruction-photo-signature-upload-upsc.pdf",
      ),
    ],
  },
  {
    slug: "ssc",
    name: "SSC CGL, CHSL, MTS and GD",
    shortName: "SSC",
    conductingBody: "Staff Selection Commission (SSC)",
    officialSite: "https://ssc.gov.in",
    lastVerified,
    title: "SSC Signature Size 2026 (10–20KB) – Resize Free | MyDocPro",
    metaDescription:
      "Prepare a 10–20 KB JPG signature for SSC forms. Check your scan, read live photo tips and resize privately in your browser.",
    h1: "SSC Signature Resizer (CGL, CHSL, MTS, GD)",
    intro:
      "Prepare the signature you upload to SSC. The photograph for the application is taken in the SSC portal or app.",
    documents: [
      // TODO: Check the current MTS annexure independently before
      // presenting the GD scanning density as a rule across all SSC notices.
      jpg(
        "signature",
        "Signature",
        10,
        20,
        [
          "Scan a clearly handwritten signature on white paper. Keep it horizontal and large enough to read.",
          "Crop excess margins while keeping the entire signature visible. CGL and CHSL specify approximate physical dimensions; the GD annexure also specifies 300 dpi.",
        ],
        {
          widthMm: 60,
          heightMm: 20,
          dpi: 300,
          cropAspect: 3,
          physicalSize: "About 6 × 2 cm",
          dimensionsNote:
            "300 dpi in the GD notice. Check the scanning instructions for your examination.",
        },
      ),
    ],
    livePhoto: {
      required: true,
      note: "SSC captures the candidate during the application. A saved photograph cannot replace this step.",
      tips: [
        "Use an evenly lit plain background. Hold the camera at eye level and face it directly.",
        "Position your whole face within the displayed outline. Remove your cap, mask and glasses for capture.",
      ],
    },
    steps: [
      "Sign on plain white paper and scan it in good light.",
      "Open the signature preset and choose the scan. Keep the writing horizontal inside the crop.",
      "Export the JPG and confirm it falls within 10–20 KB. Zoom in to check the thinnest strokes.",
      "Download the file, upload it in SSC’s signature field and take the live photo when prompted.",
    ],
    rejectionReasons: [
      "Large blank margins make the signature look miniature.",
      "Part of the signature is clipped or blurred, or the scan is sideways.",
      "The live photo is a picture of a previous photograph.",
    ],
    notes: [
      "The 2026 CGL, CHSL and GD instructions and the 2025 MTS notice give the same approximate signature shape. For MTS, check the notice for the cycle you are entering.",
    ],
    faqs: [
      faq(
        "What is the SSC CGL signature size?",
        "The 2026 CGL notice specifies a 10–20 KB JPEG signature with a width of about 6 cm and a height of about 2 cm. The GD notice also specifies 300 dpi.",
      ),
      faq(
        "Should I use 140 × 60 pixels for SSC?",
        "The cited 2026 CGL and GD instructions use physical dimensions. A universal 140 × 60 pixel setting could give you the wrong shape.",
      ),
      faq(
        "Can I resize a saved SSC photo here?",
        "The SSC application takes the candidate’s photo live. Use this page to prepare the file for the signature upload.",
      ),
      faq(
        "Why does SSC’s preview make my signature look small?",
        "A scan of a whole sheet leaves too much space around the handwriting. Crop the empty margins and compare the preview with the examples in your notice.",
      ),
      privateFiles,
    ],
    sources: [
      source(
        "SSC CGL 2026 notification",
        "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf",
      ),
      source(
        "SSC CHSL 2026 notification",
        "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2026.pdf#page=12",
      ),
      source(
        "SSC GD 2026 notification",
        "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_CTGD_2026.pdf",
      ),
      source(
        "SSC MTS 2025 notification, section 10.6",
        "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_mts_2025.pdf",
      ),
    ],
  },
  {
    slug: "ibps",
    name: "IBPS PO, Clerk/CSA, RRB and SO",
    shortName: "IBPS",
    conductingBody: "Institute of Banking Personnel Selection (IBPS)",
    officialSite: "https://www.ibps.in",
    lastVerified,
    title: "IBPS Photo, Signature, Thumb & Declaration Size | MyDocPro",
    metaDescription:
      "Resize your IBPS photo, signature, thumb impression or handwritten declaration. Use the scanned image presets and check your recruitment’s instructions.",
    h1: "IBPS Photo, Signature, Thumb & Declaration Resizer",
    intro:
      "Prepare the four image uploads using the PO/MT XVI scanning instructions. For Clerk/CSA, RRB and SO, check your recruitment’s notice before submitting.",
    documents: [
      jpg(
        "photo",
        "Passport photo",
        20,
        50,
        [
          "Use a recent colour portrait against a light, preferably white, background.",
          "Face the camera with clearly visible eyes. Avoid headwear that hides the face and dark glasses.",
        ],
        { widthPx: 200, heightPx: 230, ...preferred },
      ),
      jpg(
        "signature",
        "Signature",
        10,
        20,
        [
          "Use black ink on plain white paper and your normal handwritten signature.",
          "Keep all strokes visible and avoid block capitals.",
        ],
        { widthPx: 140, heightPx: 60, ...preferred },
      ),
      jpg(
        "thumb",
        "Left thumb impression",
        20,
        50,
        [
          "Take a clear print of your left thumb in blue or black ink on white paper.",
          "Leave the ridges and outline visible in the scan. Consult the notice for permitted alternatives if necessary.",
        ],
        { widthPx: 240, heightPx: 240, dpi: 200, ...preferred },
      ),
      jpg(
        "declaration",
        "Handwritten declaration",
        50,
        100,
        [
          "Copy your recruitment’s declaration in your own handwriting in English, in black ink on white paper.",
          "Use mixed-case writing and check that the first and last words remain readable.",
        ],
        { widthPx: 800, heightPx: 400, dpi: 200, ...preferred },
      ),
    ],
    livePhoto: {
      required: true,
      note: "PO/MT XVI requires live capture during registration in addition to the uploaded photo. Follow the prompts for the recruitment you selected.",
      tips: [
        "Use the webcam or the mobile capture option in the IBPS form. Choose a light background without shadows.",
        "Face the camera directly with eyes visible. Remove your cap and dark glasses.",
      ],
    },
    steps: [
      "Check which CRP notification applies to your post. For a declaration, find the prescribed wording first.",
      "Choose the matching document and open a clear scan or portrait.",
      "Frame the face, thumb, signature or full declaration inside the crop. Check the preview before exporting.",
      "Download each JPG separately and match it to the corresponding IBPS upload field.",
    ],
    rejectionReasons: [
      "The thumb impression is smudged or the wrong finger was used without an applicable exemption.",
      "The declaration is in block capitals or its text differs from the applicable notice.",
      "A document is placed in the wrong field or its edges are cropped.",
    ],
    // TODO: Add the exact reusable declaration text when supplied for each CRP.
    // The applicable official wording is linked at the paragraph itself below.
    notes: [
      "For the PO/MT XVI declaration, copy the wording directly from Annexure III, PDF page 41, linked below. Use the declaration in your own notification for other posts.",
    ],
    faqs: [
      faq(
        "What size should my IBPS photo be?",
        "PO/MT XVI asks for 20–50 KB. Its preferred size is 200 × 230 pixels. The portal also captures a live photograph.",
      ),
      faq(
        "What is the IBPS left thumb impression size?",
        "Use a 20–50 KB JPG. The preferred dimensions are 240 × 240 pixels. Before saving, zoom in and check that the print is distinct.",
      ),
      faq(
        "Can I type the IBPS declaration?",
        "Follow the handwriting instructions in your notice. If you need an accessible alternative, check the specific exception described there.",
      ),
      faq(
        "Where is the declaration I need to copy?",
        "The PO/MT XVI wording appears under Hand-written declaration Image in Annexure III. Use the linked official page for the full wording and replace the candidate-name blank with your own name.",
      ),
      faq(
        "What size is the IBPS signature?",
        "For PO/MT XVI, use a 10–20 KB JPG. The scanning instructions prefer 140 × 60 pixels.",
      ),
      privateFiles,
    ],
    sources: [
      source(
        "IBPS PO/MT XVI photo and signature guidelines, Annexure III",
        "https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI_Final_V1_30.06.2026.pdf#page=39",
      ),
      source(
        "Exact PO/MT XVI handwritten declaration, PDF page 41",
        "https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI_Final_V1_30.06.2026.pdf#page=41",
      ),
      source(
        "IBPS RRBs XV revised notification and scanning instructions",
        "https://www.ibps.in/wp-content/uploads/CRP-RRBs-XV-notification_Revised.pdf#page=58",
      ),
      source(
        "IBPS 2026–27 calendar, registration file sizes across recruitment processes",
        "https://www.ibps.in/wp-content/uploads/IBPS_CALENDAR_2026-27_final.pdf#page=2",
      ),
    ],
  },
  {
    slug: "rrb-ntpc",
    name: "Railway Recruitment Board NTPC",
    shortName: "RRB NTPC",
    conductingBody: "Railway Recruitment Boards (RRBs)",
    officialSite: "https://www.rrbapply.gov.in",
    lastVerified,
    title: "RRB NTPC 2026 Signature Size (30–49KB) – Resize Free | MyDocPro",
    metaDescription:
      "Resize your signature for RRB NTPC 2026: 30–49KB JPG, min 140×60 px. Photo is captured live. Free, no upload.",
    h1: "RRB NTPC Signature Resizer",
    intro:
      "Prepare your signature for RRB NTPC Graduate CEN 06/2026. The portal captures your photo live and has a separate PDF field for eligible travel-pass applicants.",
    documents: [
      jpg(
        "signature",
        "Signature",
        30,
        49,
        [
          "Use black ink on white paper. Sign in running handwriting with the letters joined.",
          "Scan at 100 dpi or higher. Centre the full signature and check the outer strokes in the preview.",
        ],
        { minWidthPx: 140, minHeightPx: 60, dpi: 100 },
      ),
      {
        type: "certificate",
        label: "SC/ST free-travel certificate",
        format: "PDF",
        maxKB: 400,
        maxExclusive: true,
        rules: [
          "For eligible applicants requesting the free train travel pass. CEN 06/2026 requires a PDF smaller than 400 KB.",
          "Inspect the entire page and its seal after compression.",
        ],
      },
    ],
    livePhoto: {
      required: true,
      note: "Use the RRB application’s live camera step. Pointing it at a saved image or a print can result in rejection.",
      tips: [
        "Stand against a plain white background in non-white clothing; a plain dark top gives good contrast.",
        "Keep both eyes open and look straight ahead. Remove glasses, cap and mask and keep hair away from the face.",
      ],
    },
    steps: [
      "Select Signature and open your scanned handwritten signature.",
      "Crop excess white space while keeping the first and last strokes visible.",
      "Export a JPG and review both the KB result and the minimum width and height.",
      "Download the signature for the RRB form. If claiming the travel pass, use the PDF option separately.",
    ],
    rejectionReasons: [
      "Block capitals or disconnected letters replace the running signature.",
      "The paper is shaded, the ink is too faint, or part of the signature is outside the crop.",
      "A printed or digital portrait is photographed during live capture.",
    ],
    faqs: [
      faq(
        "What signature size does RRB NTPC Graduate require?",
        "CEN 06/2026 specifies a 30–49 KB JPG, at least 140 pixels wide and 60 pixels high. Larger dimensions can meet the minimum.",
      ),
      faq(
        "Can I use an old passport photo for RRB NTPC?",
        "Use the portal’s live camera capture. An existing digital portrait or a photograph of a print does not satisfy this requirement.",
      ),
      faq(
        "Who should upload the SC/ST certificate here?",
        "The RRB form asks for a PDF from eligible applicants requesting the free train travel pass. Prepare your PDF locally, then submit it to RRB.",
      ),
      faq(
        "Why does my signature fail even if the KB size is right?",
        "Also check minimum dimensions, ink, legibility and framing. RRB requires a complete signature in running handwriting on white paper.",
      ),
      privateFiles,
    ],
    sources: [
      source(
        "Railway Recruitment Boards, recruitment notices",
        "https://rrb.indianrailways.gov.in",
      ),
      source(
        "Government of India announcement for CEN 06/2026",
        "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2321873",
      ),
      source(
        "RRB Graduate CEN 06/2026, sections 14.4–14.5 (public copy)",
        "https://aditya.ac.in/acce/notifications/NOTIFICATION%20RRB%20NTPC.pdf#page=24",
      ),
    ],
  },
];
