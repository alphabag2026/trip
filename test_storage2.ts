import { ENV } from "./server/_core/env";

async function main() {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const apiKey = ENV.forgeApiKey;
  
  console.log("baseUrl:", baseUrl);
  console.log("apiKey exists:", !!apiKey);
  
  // Test downloadUrl API
  const downloadApiUrl = new URL("v1/storage/downloadUrl", baseUrl + "/");
  downloadApiUrl.searchParams.set("path", "1000048744_b0cc2d58.jpg");
  
  console.log("\ndownloadUrl API:", downloadApiUrl.toString());
  
  const resp = await fetch(downloadApiUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  console.log("API status:", resp.status);
  const body = await resp.text();
  console.log("API response:", body.substring(0, 500));
  
  // Also try the direct URL with different path patterns
  const directUrl = `${baseUrl}/v1/storage/download?path=1000048744_b0cc2d58.jpg`;
  console.log("\nDirect download URL:", directUrl);
  const resp2 = await fetch(directUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  console.log("Direct status:", resp2.status);
  console.log("Direct content-type:", resp2.headers.get("content-type"));
  console.log("Direct content-length:", resp2.headers.get("content-length"));
}
main();
