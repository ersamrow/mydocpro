import Link from "next/link";
import ResizeFaqs from "./ResizeFaqs.js";
import PhotoSizeLinks from "./PhotoSizeLinks.js";
import { resizeFaqs } from "../src/photo-sizes.js";
export default function ResizeImageGuide() {
  return (
    <>
      <h2>How to resize an image in cm</h2>
      <p>
        Use this image resizer in cm to set photo width and height for printing
        or an application form. You can also choose millimetres, inches or
        pixels. JPG, PNG and WebP images are resized in your browser without
        uploading your photo to a server.
      </p>
      <ol>
        <li>Choose your image and read the destination’s size requirements.</li>
        <li>
          Select Centimetres or Millimetres under Unit, then enter Width and
          Height. For a 3.5 × 4.5 cm photo, enter 3.5 and 4.5 in centimetres, or
          35 and 45 in millimetres.
        </li>
        <li>
          Set DPI to calculate the pixel dimensions. Use the destination’s
          specified DPI; 300 DPI is a useful print example, not a universal
          rule.
        </li>
        <li>
          Choose a Fit option and an output format accepted by the destination,
          then enter Max size (KB, optional) if the form also has a file-size
          limit. Process and download the image.
        </li>
        <li>
          Open the download and check its dimensions, framing, readability and
          file size before submitting it.
        </li>
      </ol>
      <h3>Worked example: 3.5 × 4.5 cm at 300 DPI</h3>
      <p>
        Pixels = centimetres ÷ 2.54 × DPI. A width of 3.5 cm gives 3.5 ÷ 2.54 ×
        300 ≈ 413 pixels; a height of 4.5 cm gives approximately 531 pixels.
        Entering 35 × 45 mm at the same DPI gives the same result. For
        millimetres, use pixels = millimetres ÷ 25.4 × DPI.
      </p>
      <p>
        Start with the{" "}
        <Link href="/resize-image/3-5x4-5-cm" prefetch={false}>
          3.5 × 4.5 cm photo resizer (413 × 531 pixels at 300 DPI)
        </Link>{" "}
        for these dimensions, or choose the{" "}
        <Link href="/resize-image/2-5x3-5-cm" prefetch={false}>
          2.5 × 3.5 cm preset (295 × 413 pixels)
        </Link>{" "}
        when your instructions specify that size. To calculate another size
        first, use the{" "}
        <Link href="/cm-to-pixels" prefetch={false}>
          cm-to-pixels calculator
        </Link>
        .
      </p>
      <h3>Resize image width and height without stretching</h3>
      <p>
        Check the source image’s shape before setting two dimensions. A square
        photo cannot fill a portrait rectangle without cropping, padding or
        distortion. Choose the option that matches your destination’s rules.
      </p>
      <ul>
        <li>
          <strong>Fit inside (white padding):</strong> keeps the whole image in
          proportion and adds white space where the shapes do not match. Check
          whether the receiving form allows borders.
        </li>
        <li>
          <strong>Fill (centre crop):</strong> fills the dimensions without
          stretching, but cuts off edges. Check that the face, hair and
          signature strokes stay inside the frame.
        </li>
        <li>
          <strong>Stretch:</strong> forces the image into the dimensions and can
          distort faces or signatures when the proportions differ.
        </li>
      </ul>
      <h3>Does DPI set the printed photo size?</h3>
      <p>
        DPI calculates the output pixel dimensions. JPG and PNG downloads also
        include the selected DPI in their resolution metadata. Print at Actual
        size (100%), disable automatic fit or enlargement, and measure a trial
        print because printer settings can override the intended size. WebP
        output does not include this print-density metadata. Increasing DPI
        cannot restore missing detail from a blurry source.
      </p>
      <h3>How do I resize a photo in cm and KB together?</h3>
      <p>
        Width and height control dimensions; KB measures file size. Format and
        image detail also affect file size. Set your dimensions and DPI first,
        then enter the maximum allowed KB in Max size (KB, optional). For
        example, 3.5 × 4.5 cm at 300 DPI with a 50 KB maximum requests a 413 ×
        531 pixel image within that limit. The resizer preserves those exact
        pixel dimensions while adjusting compression. If it cannot meet the
        limit, it reports an error instead of shrinking the image. Try JPG or
        WebP if the destination accepts it, or a larger permitted limit. PNG is
        lossless and may not fit a small KB target.
      </p>
      <p>
        Check the downloaded dimensions, size and framing against the receiving
        form’s current requirements. A size preset does not certify acceptance
        by an exam or passport authority.
      </p>
      <ResizeFaqs faqs={resizeFaqs} />
      <PhotoSizeLinks />
    </>
  );
}
