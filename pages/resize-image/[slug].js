import Link from "next/link";
import Workspace from "../../components/Workspace.jsx";
import SeoHead from "../../components/SeoHead.js";
import PhotoSizeLinks from "../../components/PhotoSizeLinks.js";
import ResizeFaqs from "../../components/ResizeFaqs.js";
import { ToolLayout, Card } from "../../components/ui.js";
import { tools } from "../../src/tools.js";
import {
  photoSizes,
  sizePixels,
  sizeSettings,
  sizeFaqs,
} from "../../src/photo-sizes.js";
import { photoSizeSeo } from "../../src/photo-size-seo.js";
import { examLinks } from "../../src/routes.js";
export default function PhotoSizePage({ size }) {
  const meta = photoSizeSeo(size);
  const source = size.width > size.height ? [1600, 1200] : [1200, 1600];
  const cropScale = Math.max(size.width / source[0], size.height / source[1]);
  const crop = [size.width, size.height].map((value) =>
    Math.round(value / cropScale),
  );
  return (
    <>
      <SeoHead meta={meta} />
      <Workspace
        key={size.slug}
        tool={tools.find((t) => t[0] === "resize-image")}
        metaOverride={meta}
        initialSettings={sizeSettings(size)}
        headingExtra={
          <>
            <p>
              <strong>
                {size.label} = {sizePixels(size).join(" × ")} pixels at 300 DPI
              </strong>
              ; {sizePixels(size, 200).join(" × ")} pixels at 200 DPI.
            </p>
            {size.note && <p>{size.note}</p>}
          </>
        }
      />
      <ToolLayout as="section">
        <Card className="tool-guide">
          <h2>Framing a {size.label} photo</h2>
          <p>{size.framing}</p>
          <h3>Centre-crop planning example</h3>
          <p>
            For a {source.join(" × ")} pixel source, Fill uses approximately{" "}
            {crop.join(" × ")} source pixels, then resizes that area to{" "}
            {sizePixels(size).join(" × ")} pixels at 300 DPI. This calculation
            describes the crop geometry; the preview lets you check whether
            important details fall outside it. Fit inside keeps the whole image
            and adds white space instead.
          </p>
          <p>
            For a physical print, choose Actual size or 100% and measure a trial
            copy: it should be {size.width} cm wide and {size.height} cm high.
            Fitting one image to an A4 sheet enlarges it. For multiple copies on
            paper, use the <Link href="/passport-sheet">photo sheet maker</Link>
            .
          </p>
          <h2>How to resize a photo to {size.label}</h2>
          <ol>
            <li>
              Choose your original photo. The settings start at {size.label},
              centimetres and 300 DPI.
            </li>
            <li>
              Check the Fill (centre crop) preview. Use Fit inside if you need
              the full image with white padding.
            </li>
            <li>
              Choose an accepted output format and enter Max size (KB, optional)
              if required.
            </li>
            <li>
              Download and check the framing, pixel dimensions and file size
              before submitting.
            </li>
          </ol>
          <ResizeFaqs faqs={sizeFaqs(size)} />
          <p>
            <Link href="/exam-photo">Exam photo presets</Link> ·{" "}
            <Link href="/resize-image">Custom image dimensions</Link>
          </p>
          <PhotoSizeLinks exclude={size.slug} />
        </Card>
      </ToolLayout>
    </>
  );
}
export function getStaticPaths() {
  return {
    paths: photoSizes.map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  };
}
export function getStaticProps({ params }) {
  const size = photoSizes.find((s) => s.slug === params.slug);
  return size
    ? { props: { size, id: "resize-image/" + size.slug, examLinks } }
    : { notFound: true };
}
