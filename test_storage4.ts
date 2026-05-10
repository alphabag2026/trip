import { ENV } from "./server/_core/env";

async function main() {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const apiKey = ENV.forgeApiKey;
  
  // The download endpoint says "invalid uidPath format, expected {uid}/{filePath}"
  // The CloudFront URL has: 310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/filename
  // Let's try with the full path including uid
  
  const fullPaths = [
    "310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/1000048744_b0cc2d58.jpg",
    "9L2UFkGMTFNGvGrFPN8jYv/1000048744_b0cc2d58.jpg",
  ];
  
  for (const p of fullPaths) {
    // Try download endpoint
    const url = `${baseUrl}/v1/storage/download?path=${encodeURIComponent(p)}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log(`\ndownload path="${p}"`);
    console.log(`  Status: ${resp.status}`);
    console.log(`  Content-Type: ${resp.headers.get("content-type")}`);
    if (resp.status === 200) {
      const buf = await resp.arrayBuffer();
      console.log(`  Size: ${buf.byteLength} bytes`);
      // Save to verify
      const fs = await import("fs");
      fs.writeFileSync(`/tmp/test_passport_${p.replace(/\//g, '_')}.jpg`, Buffer.from(buf));
      console.log(`  Saved to /tmp/test_passport_${p.replace(/\//g, '_')}.jpg`);
    } else {
      const body = await resp.text();
      console.log(`  Body: ${body.substring(0, 300)}`);
    }
  }
  
  // Also try downloadUrl with full path
  for (const p of fullPaths) {
    const url = `${baseUrl}/v1/storage/downloadUrl?path=${encodeURIComponent(p)}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log(`\ndownloadUrl path="${p}"`);
    console.log(`  Status: ${resp.status}`);
    const body = await resp.text();
    console.log(`  Body: ${body.substring(0, 300)}`);
  }
}
main();
