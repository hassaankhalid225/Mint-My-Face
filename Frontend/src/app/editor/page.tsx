import { Suspense } from "react";
import AuthWelcomeBanner from "@/components/AuthWelcomeBanner";
import CanvasEditor from "@/components/CanvasEditor";
import JsonLd, { WebApplicationJsonLd } from "@/components/JsonLd";
import SiteNav from "@/components/SiteNav";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

const EDITOR_DESCRIPTION =
  "Upload your photo and place it on a custom dollar bill. Drag, resize, add text, apply filters, and mint your note — free watermarked preview or Pro full HD download.";

export const metadata = pageMetadata({
  title: "Editor Studio",
  description: EDITOR_DESCRIPTION,
  path: "/editor",
  keywords: [
    "dollar bill editor",
    "custom note maker",
    "photo on dollar bill",
    "online bill designer",
  ],
});

export default function EditorPage() {
  return (
    <div className="editor-page">
      <WebApplicationJsonLd
        name={`${SITE_NAME} Editor`}
        description={EDITOR_DESCRIPTION}
        url={`${SITE_URL}/editor`}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Editor",
              item: `${SITE_URL}/editor`,
            },
          ],
        }}
      />
      <SiteNav variant="editor" />
      <Suspense fallback={null}>
        <AuthWelcomeBanner />
      </Suspense>
      <div className="editor-page__workspace">
        <CanvasEditor />
      </div>
    </div>
  );
}
