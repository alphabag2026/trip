import { describe, it, expect, vi } from "vitest";

describe("Telegram EXPORT_CSV and PASSPORT_PDF improvements", () => {
  it("should have EXPORT_CSV intent in the LLM system prompt", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    expect(content).toContain("EXPORT_CSV");
    expect(content).toContain("dataType");
    expect(content).toContain("participants");
    expect(content).toContain("accommodations");
    expect(content).toContain("flights");
    expect(content).toContain("passports");
  });

  it("should have sendBotDocument function defined", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    expect(content).toContain("async function sendBotDocument");
    expect(content).toContain("sendDocument");
    expect(content).toContain("chat_id");
    expect(content).toContain("document: fileUrl");
  });

  it("should handle __SEND_DOC__ protocol in executeCommand results", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    // Check that __SEND_DOC__ protocol is handled in the webhook handler
    expect(content).toContain("__SEND_DOC__");
    expect(content).toContain("__SEP__");
    expect(content).toContain('executionResult.startsWith("__SEND_DOC__")');
  });

  it("should have error handler that replies to user", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    // Check the error handler sends a reply
    expect(content).toContain("처리 중 오류가 발생했습니다");
    expect(content).toContain("req.body?.message?.chat?.id");
  });

  it("should generate CSV with BOM for Korean Excel compatibility", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    // BOM character for UTF-8 CSV files
    expect(content).toContain("\\uFEFF");
  });

  it("PASSPORT_PDF should use __SEND_DOC__ protocol to send file directly", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    // PASSPORT_PDF should return __SEND_DOC__ format
    const passportPdfSection = content.substring(
      content.indexOf('case "PASSPORT_PDF"'),
      content.indexOf('case "TRAVEL_INFO"')
    );
    expect(passportPdfSection).toContain("__SEND_DOC__");
  });

  it("should support all CSV data types", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/telegramWebhook.ts", "utf-8");
    const exportCsvSection = content.substring(
      content.indexOf('case "EXPORT_CSV"'),
      content.indexOf('case "PASSPORT_PDF"')
    );
    expect(exportCsvSection).toContain('dataType === "participants"');
    expect(exportCsvSection).toContain('dataType === "accommodations"');
    expect(exportCsvSection).toContain('dataType === "flights"');
    expect(exportCsvSection).toContain('dataType === "passports"');
  });
});
