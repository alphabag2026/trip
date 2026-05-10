import { ENV } from "./server/_core/env";
import { storagePut, storageGet } from "./server/storage";

async function main() {
  // The issue: files stored with /manus-storage/ prefix were uploaded via the web frontend
  // The storageGet returns a CloudFront URL that gives 403
  // This means the files might have been uploaded through a different mechanism
  
  // Let's check: maybe we need to use the site's own URL to access the images
  // The /manus-storage/ path is served by the web app itself
  
  // Try accessing via the site URL
  const siteUrl = "https://alphatrip.org";
  const imgPath = "/manus-storage/1000048744_b0cc2d58.jpg";
  
  console.log("Testing site URL access...");
  const resp = await fetch(`${siteUrl}${imgPath}`, {
    redirect: "follow",
  });
  console.log(`${siteUrl}${imgPath}`);
  console.log(`  Status: ${resp.status}`);
  console.log(`  Content-Type: ${resp.headers.get("content-type")}`);
  console.log(`  Content-Length: ${resp.headers.get("content-length")}`);
  
  if (resp.status === 200) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("image")) {
      const buf = await resp.arrayBuffer();
      console.log(`  Image size: ${buf.byteLength} bytes`);
      const fs = await import("fs");
      fs.writeFileSync("/tmp/test_passport_from_site.jpg", Buffer.from(buf));
      console.log("  Saved to /tmp/test_passport_from_site.jpg");
    } else {
      const body = await resp.text();
      console.log(`  Body (first 200): ${body.substring(0, 200)}`);
    }
  }
  
  // Also try the dev server URL
  const devUrl = "http://localhost:3000";
  const resp2 = await fetch(`${devUrl}${imgPath}`, { redirect: "follow" });
  console.log(`\n${devUrl}${imgPath}`);
  console.log(`  Status: ${resp2.status}`);
  console.log(`  Content-Type: ${resp2.headers.get("content-type")}`);
  if (resp2.status === 200) {
    const ct = resp2.headers.get("content-type") || "";
    if (ct.includes("image")) {
      const buf = await resp2.arrayBuffer();
      console.log(`  Image size: ${buf.byteLength} bytes`);
    } else {
      const body = await resp2.text();
      console.log(`  Body (first 200): ${body.substring(0, 200)}`);
    }
  }
}
main();
