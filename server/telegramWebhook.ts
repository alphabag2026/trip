/**
 * Telegram Bot Webhook Endpoint
 * 
 * Receives messages from Telegram Bot API via webhook
 * Automatically parses travel information using LLM
 * Stores uploads in telegram_uploads table for admin review
 * 
 * Endpoint: POST /api/telegram/webhook
 * Setup:    POST /api/telegram/webhook/setup (via tRPC admin procedure)
 */

import { Router, Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import {
  getTelegramConfig,
  createTelegramUpload,
  updateTelegramUpload,
} from "./db";

const webhookRouter = Router();

// ── Telegram Bot API helpers ──────────────────────────────

async function downloadTelegramFile(botToken: string, fileId: string): Promise<{ buffer: Buffer; filePath: string } | null> {
  try {
    // Get file path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const fileData = await fileRes.json() as any;
    if (!fileData.ok || !fileData.result?.file_path) return null;

    // Download the file
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) return null;

    const buffer = Buffer.from(await downloadRes.arrayBuffer());
    return { buffer, filePath: fileData.result.file_path };
  } catch (e) {
    console.error("[TelegramWebhook] File download failed:", e);
    return null;
  }
}

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", pdf: "application/pdf", doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv", txt: "text/plain",
  };
  return mimeMap[ext] || "application/octet-stream";
}

// ── LLM Travel Info Parser ──────────────────────────────

async function parseTravelInfoWithLLM(text: string, fileType: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a travel information parser. Analyze the given text and extract structured travel data.
Return JSON with the following structure:
{
  "type": "flight" | "hotel" | "schedule" | "transfer" | "general" | "unknown",
  "confidence": 0-100,
  "summary": "brief Korean summary of the content",
  "data": {
    // For flight: flightNo, airline, departureAirport, arrivalAirport, departureTime (ISO), arrivalTime (ISO), terminal, gate, notes
    // For hotel: hotelName, address, roomNumber, roomType, checkIn (ISO), checkOut (ISO), notes
    // For schedule: title, location, eventTime (ISO), endTime (ISO), description
    // For transfer: vehicleType, pickupLocation, pickupTime (ISO), driverName, driverPhone, notes
    // For general/unknown: content, notes
  }
}
Always respond in valid JSON only.`,
        },
        {
          role: "user",
          content: `Parse this travel information (source: ${fileType}):\n\n${text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        type: parsed.type || "unknown",
        confidence: parsed.confidence || 50,
        summary: parsed.summary || "파싱 완료",
        data: parsed.data || {},
      };
    }
    return { type: "unknown", confidence: 0, summary: "파싱 실패", data: {} };
  } catch (e) {
    console.error("[TelegramWebhook LLM Parse] Error:", e);
    return { type: "unknown", confidence: 0, summary: "LLM 파싱 오류", data: {} };
  }
}

// ── Webhook Handler ──────────────────────────────────────

webhookRouter.post("/", async (req: Request, res: Response) => {
  try {
    const update = req.body;
    
    // Telegram sends updates with message or edited_message
    const message = update?.message || update?.edited_message;
    if (!message) {
      return res.json({ ok: true, skipped: true });
    }

    const config = await getTelegramConfig();
    if (!config?.enabled || !config.botToken) {
      return res.json({ ok: true, skipped: true, reason: "bot_disabled" });
    }

    // Extract message info
    const chatId = String(message.chat?.id || "");
    const messageId = String(message.message_id || "");
    const fromUser = message.from?.username || message.from?.first_name || "unknown";
    const fromUserId = String(message.from?.id || "");
    
    let rawText = message.text || message.caption || "";
    let rawFileUrl: string | undefined;
    let rawFileType: "text" | "image" | "document" | "photo" = "text";

    // Handle photo messages
    if (message.photo && message.photo.length > 0) {
      rawFileType = "photo";
      // Get the largest photo (last in array)
      const largestPhoto = message.photo[message.photo.length - 1];
      const fileResult = await downloadTelegramFile(config.botToken, largestPhoto.file_id);
      if (fileResult) {
        const fileKey = `telegram-uploads/${nanoid()}-${fileResult.filePath.split("/").pop()}`;
        const { url } = await storagePut(fileKey, fileResult.buffer, getMimeType(fileResult.filePath));
        rawFileUrl = url;
      }
    }
    
    // Handle document messages
    if (message.document) {
      rawFileType = "document";
      const fileResult = await downloadTelegramFile(config.botToken, message.document.file_id);
      if (fileResult) {
        const fileName = message.document.file_name || fileResult.filePath.split("/").pop() || "file";
        const fileKey = `telegram-uploads/${nanoid()}-${fileName}`;
        const { url } = await storagePut(fileKey, fileResult.buffer, getMimeType(fileName));
        rawFileUrl = url;
      }
    }

    // Skip if no text and no file
    if (!rawText && !rawFileUrl) {
      return res.json({ ok: true, skipped: true, reason: "no_content" });
    }

    // Handle bot commands
    if (rawText.startsWith("/")) {
      const command = rawText.split(" ")[0].toLowerCase();
      switch (command) {
        case "/start":
          await sendBotReply(config.botToken, chatId, 
            "🛫 Meetup Travel 봇에 오신 것을 환영합니다!\n\n" +
            "여행 정보를 텍스트나 이미지로 보내주시면 자동으로 분석하여 백오피스에 등록합니다.\n\n" +
            "📋 지원 형식:\n" +
            "• 항공편 정보 (편명, 출발/도착 시간)\n" +
            "• 호텔 정보 (호텔명, 체크인/체크아웃)\n" +
            "• 일정 정보 (장소, 시간, 설명)\n" +
            "• 이동 정보 (차량, 픽업 장소/시간)\n\n" +
            "📸 이미지/문서도 자동 인식합니다.\n\n" +
            "/help - 도움말\n" +
            "/status - 최근 업로드 상태"
          );
          return res.json({ ok: true, command: "start" });
        
        case "/help":
          await sendBotReply(config.botToken, chatId,
            "📖 사용 방법:\n\n" +
            "1️⃣ 텍스트로 여행 정보 전송\n" +
            "예: \"KE123 인천→방콕 3/25 10:00 출발\"\n\n" +
            "2️⃣ 항공권/호텔 바우처 사진 전송\n" +
            "→ OCR로 자동 인식\n\n" +
            "3️⃣ 문서 파일 전송 (PDF, Excel 등)\n" +
            "→ 백오피스에 자동 저장\n\n" +
            "모든 정보는 백오피스에서 관리자가 확인 후 승인합니다."
          );
          return res.json({ ok: true, command: "help" });
        
        case "/status":
          await sendBotReply(config.botToken, chatId, "✅ 봇이 정상 작동 중입니다.\n관리자가 백오피스에서 업로드 내역을 확인할 수 있습니다.");
          return res.json({ ok: true, command: "status" });
        
        default:
          // Unknown command, treat as regular text
          break;
      }
    }

    // 1. Save to telegram_uploads
    const uploadId = await createTelegramUpload({
      uploadedBy: `@${fromUser} (${fromUserId})`,
      telegramMessageId: messageId,
      telegramChatId: chatId,
      rawText: rawText || undefined,
      rawFileUrl: rawFileUrl || undefined,
      rawFileType,
      status: "pending",
    });

    // 2. Auto-parse with LLM
    const textToParse = rawText || (rawFileUrl ? `[${rawFileType} file uploaded: ${rawFileUrl}]` : "");
    try {
      const parseResult = await parseTravelInfoWithLLM(textToParse, rawFileType);
      await updateTelegramUpload(uploadId, {
        parsedType: parseResult.type as any,
        parsedData: parseResult.data,
        parsedConfidence: parseResult.confidence,
        parsedSummary: parseResult.summary,
        status: "parsed",
      });

      // 3. Send confirmation to Telegram
      const typeLabels: Record<string, string> = {
        flight: "✈️ 항공편", hotel: "🏨 호텔", schedule: "📅 일정",
        transfer: "🚗 이동", general: "📝 일반", unknown: "❓ 미분류",
      };
      const typeLabel = typeLabels[parseResult.type] || "📝 정보";
      await sendBotReply(config.botToken, chatId,
        `${typeLabel} 정보가 접수되었습니다.\n` +
        `📊 분석 신뢰도: ${parseResult.confidence}%\n` +
        `📝 요약: ${parseResult.summary}\n\n` +
        `관리자가 백오피스에서 확인 후 승인합니다. (#${uploadId})`
      );
    } catch (e) {
      console.error("[TelegramWebhook] LLM parsing failed:", e);
      // Still saved, just not parsed
      await sendBotReply(config.botToken, chatId,
        `📥 정보가 접수되었습니다. (#${uploadId})\n자동 분석에 실패했지만, 관리자가 수동으로 확인합니다.`
      );
    }

    return res.json({ ok: true, uploadId });
  } catch (error) {
    console.error("[TelegramWebhook] Error:", error);
    return res.status(200).json({ ok: false, error: "Internal error" });
  }
});

// ── Setup endpoint (register webhook with Telegram) ──────

webhookRouter.post("/setup", async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ ok: false, error: "webhookUrl is required" });
    }

    const config = await getTelegramConfig();
    if (!config?.botToken) {
      return res.status(400).json({ ok: false, error: "Bot token not configured" });
    }

    // Register webhook with Telegram
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message"],
        drop_pending_updates: false,
      }),
    });

    const result = await response.json() as any;
    return res.json({ ok: result.ok, description: result.description });
  } catch (error) {
    console.error("[TelegramWebhook] Setup error:", error);
    return res.status(500).json({ ok: false, error: "Setup failed" });
  }
});

// ── Get webhook info ──────────────────────────────────────

webhookRouter.get("/info", async (_req: Request, res: Response) => {
  try {
    const config = await getTelegramConfig();
    if (!config?.botToken) {
      return res.json({ ok: false, error: "Bot token not configured" });
    }

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getWebhookInfo`);
    const result = await response.json();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Failed to get webhook info" });
  }
});

// ── Delete webhook ────────────────────────────────────────

webhookRouter.delete("/", async (_req: Request, res: Response) => {
  try {
    const config = await getTelegramConfig();
    if (!config?.botToken) {
      return res.json({ ok: false, error: "Bot token not configured" });
    }

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
    const result = await response.json();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Failed to delete webhook" });
  }
});

// ── Helper: Send reply to Telegram ────────────────────────

async function sendBotReply(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("[TelegramWebhook] Reply failed:", e);
  }
}

export function createTelegramWebhookRouter() {
  return webhookRouter;
}
