import { storageGet } from "./server/storage";

async function main() {
  try {
    const result = await storageGet("1000048744_b0cc2d58.jpg");
    console.log("storageGet result:", JSON.stringify(result, null, 2));
    
    // Try downloading the image
    const resp = await fetch(result.url);
    console.log("Download status:", resp.status);
    console.log("Content-Type:", resp.headers.get("content-type"));
    console.log("Content-Length:", resp.headers.get("content-length"));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
main();
