export default function ResizeImageGuide() {
  return (
    <>
      <h2>How to resize an image in cm or mm</h2>
      <p>
        Set exact photo dimensions in centimetres, millimetres, inches or
        pixels. Resize JPG, PNG and WebP images locally in your browser without
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
          then process and download the image.
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
      <h3>Should I crop or add white padding?</h3>
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
        DPI here calculates the output pixel dimensions. It does not guarantee
        matching resolution metadata in the downloaded file. Set the intended
        physical size in your print settings, disable automatic fit or
        enlargement, and measure a trial print. Increasing DPI cannot restore
        missing detail from a blurry source.
      </p>
      <h3>Why is my resized image still too large in KB?</h3>
      <p>
        Width and height control dimensions; KB measures file size. Format and
        image detail also affect file size. If your form has a KB limit,
        compress the resized image next and recheck its final pixel dimensions.
        Resizing alone does not guarantee any particular file size or
        application acceptance.
      </p>
    </>
  );
}
