import { ENV } from "./server/_core/env";

async function main() {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const apiKey = ENV.forgeApiKey;
  
  // The downloadUrl returns a CloudFront URL that gives 403
  // Let's try to use the forge API as a proxy to download the file
  // Try different endpoints
  
  const endpoints = [
    `${baseUrl}/v1/storage/download?path=1000048744_b0cc2d58.jpg`,
    `${baseUrl}/v1/storage/file?path=1000048744_b0cc2d58.jpg`,
    `${baseUrl}/v1/storage/get?path=1000048744_b0cc2d58.jpg`,
    `${baseUrl}/manus-storage/1000048744_b0cc2d58.jpg`,
  ];
  
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      console.log(`\n${url}`);
      console.log(`  Status: ${resp.status}`);
      console.log(`  Content-Type: ${resp.headers.get("content-type")}`);
      console.log(`  Content-Length: ${resp.headers.get("content-length")}`);
      if (resp.status !== 200) {
        const body = await resp.text();
        console.log(`  Body: ${body.substring(0, 200)}`);
      }
    } catch (e: any) {
      console.log(`\n${url} -> Error: ${e.message}`);
    }
  }
  
  // Also try the CloudFront URL with different query params (signed URL)
  const cfUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/1000048744_b0cc2d58.jpg";
  const resp = await fetch(cfUrl);
  console.log(`\nCloudFront direct: ${cfUrl}`);
  console.log(`  Status: ${resp.status}`);
  const errBody = await resp.text();
  console.log(`  Body: ${errBody.substring(0, 300)}`);
}
main();
