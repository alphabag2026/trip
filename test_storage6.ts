import { ENV } from "./server/_core/env";

async function main() {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const apiKey = ENV.forgeApiKey;
  
  // The /manus-storage/ URL is a frontend path that the Manus platform resolves
  // It's NOT a server-side path. The platform's CDN handles it.
  // The CloudFront URL gives 403 because it needs signed cookies (set by the platform)
  
  // The correct approach: use the Manus platform's storage proxy
  // The storagePut returns a URL like /manus-storage/filename.jpg
  // which is accessible via the browser (with platform cookies)
  // but NOT accessible server-side without proper auth
  
  // Let's try: re-upload the file through storagePut to get a proper URL
  // First, let's check if the file exists by trying to list storage
  
  // Try the published site URL (manus.space domain) which might have the storage proxy
  const manusUrl = "https://meetup-trav-9l2ufkgm.manus.space";
  const imgPath = "/manus-storage/1000048744_b0cc2d58.jpg";
  
  console.log("Testing manus.space URL...");
  const resp = await fetch(`${manusUrl}${imgPath}`, { redirect: "follow" });
  console.log(`${manusUrl}${imgPath}`);
  console.log(`  Status: ${resp.status}`);
  console.log(`  Content-Type: ${resp.headers.get("content-type")}`);
  console.log(`  Content-Length: ${resp.headers.get("content-length")}`);
  
  if (resp.status === 200) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("image")) {
      const buf = await resp.arrayBuffer();
      console.log(`  Image size: ${buf.byteLength} bytes - SUCCESS!`);
    } else {
      const body = await resp.text();
      console.log(`  Body (first 200): ${body.substring(0, 200)}`);
    }
  }
  
  // Try with the dev preview URL
  const devUrl = "https://3000-i9viy72d8xu7r5t4v28uy-562e0666.sg1.manus.computer";
  console.log("\nTesting dev preview URL...");
  const resp2 = await fetch(`${devUrl}${imgPath}`, { redirect: "follow" });
  console.log(`${devUrl}${imgPath}`);
  console.log(`  Status: ${resp2.status}`);
  console.log(`  Content-Type: ${resp2.headers.get("content-type")}`);
  
  if (resp2.status === 200) {
    const ct = resp2.headers.get("content-type") || "";
    if (ct.includes("image")) {
      const buf = await resp2.arrayBuffer();
      console.log(`  Image size: ${buf.byteLength} bytes - SUCCESS!`);
      const fs = await import("fs");
      fs.writeFileSync("/tmp/test_passport_dev.jpg", Buffer.from(buf));
      console.log("  Saved to /tmp/test_passport_dev.jpg");
    } else {
      const body = await resp2.text();
      console.log(`  Body (first 200): ${body.substring(0, 200)}`);
    }
  }
}
main();
