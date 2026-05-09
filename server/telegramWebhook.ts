/**
 * Telegram Bot Webhook Endpoint - AI Natural Language Command System
 * 
 * Receives messages from Telegram Bot API via webhook
 * Uses LLM to understand natural language commands and execute backoffice functions
 * Supports: participant registration, meetup management, flight/hotel assignment, stats, etc.
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
  getMeetups,
  getRegistrations,
  createRegistration,
  getFlightSchedules,
  createFlightSchedule,
  getAccommodations,
  createAccommodation,
  getTelegramUploadStats,
  createTelegramNotification,
} from "./db";

const webhookRouter = Router();

// ── Telegram Bot API helpers ──────────────────────────────

async function downloadTelegramFile(botToken: string, fileId: string): Promise<{ buffer: Buffer; filePath: string } | null> {
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const fileData = await fileRes.json() as any;
    if (!fileData.ok || !fileData.result?.file_path) return null;

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

// ── AI Command Router ─────────────────────────────────────

interface CommandResult {
  intent: string;
  action: string;
  response: string;
  data?: any;
  shouldSave?: boolean;
}

async function processNaturalLanguageCommand(text: string, imageUrl?: string): Promise<CommandResult> {
  try {
    const messages: any[] = [
      {
        role: "system",
        content: `당신은 Meetup Travel 백오피스 AI 어시스턴트입니다. 사용자의 자연어 명령을 분석하여 적절한 작업을 실행합니다.

사용 가능한 명령 카테고리:
1. REGISTER_PARTICIPANTS - 참가자 등록 (이름, 여권번호, 항공편 정보 등)
2. CREATE_MEETUP - 밋업 생성 (제목, 장소, 날짜, 국가 등)
3. LIST_MEETUPS - 밋업 목록 조회
4. LIST_PARTICIPANTS - 참가자 목록 조회 (밋업별, 상태별)
5. ASSIGN_FLIGHT - 항공편 배정/등록
6. ASSIGN_HOTEL - 숙소 배정/등록
7. GET_STATS - 통계/현황 조회
8. SEARCH - 검색 (참가자, 밋업, 항공편 등)
9. UPDATE_STATUS - 상태 변경 (참가자 승인/거절 등)
10. SEND_NOTICE - 공지 발송
11. TRAVEL_INFO - 여행 정보 파싱 (항공편, 호텔, 일정 등)
12. OCR_PASSPORT - 여권/항공권 이미지 OCR 분석
13. HELP - 도움말
14. UNKNOWN - 알 수 없는 명령

응답 JSON 형식:
{
  "intent": "카테고리명",
  "action": "구체적 실행 내용 설명",
  "params": {
    // 추출된 파라미터들
  },
  "response": "사용자에게 보여줄 한국어 응답 메시지",
  "shouldSave": true/false (텔레그램 업로드로 저장할지)
}

규칙:
- 항상 한국어로 응답
- 참가자 등록 시: 이름, 여권번호, 생년월일, 성별, 국적, 여권만료일, 항공편, 예약번호 등을 추출
- 밋업 관련: 제목, 장소, 시작일, 종료일, 초청국가 등을 추출
- 프롬프트 형식 입력도 이해: "하롱베이 2140 Xplay 행사 박석봉팀 5월 10일부터 5월 13일까지"
- 여러 참가자 정보가 한번에 올 수 있음 (줄바꿈으로 구분)
- 이미지가 함께 온 경우 OCR_PASSPORT로 분류
- 불확실한 경우 확인 질문을 response에 포함`,
      },
    ];

    // Build user message content
    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: text || "이 이미지를 분석해주세요" },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: text,
      });
    }

    const response = await invokeLLM({
      messages,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent || "UNKNOWN",
        action: parsed.action || "",
        response: parsed.response || "명령을 처리했습니다.",
        data: parsed.params || {},
        shouldSave: parsed.shouldSave !== false,
      };
    }
    return { intent: "UNKNOWN", action: "", response: "명령을 이해하지 못했습니다.", shouldSave: false };
  } catch (e) {
    console.error("[TelegramWebhook] AI Command Error:", e);
    return { intent: "UNKNOWN", action: "error", response: "AI 처리 중 오류가 발생했습니다.", shouldSave: false };
  }
}

// ── Execute Commands ─────────────────────────────────────

async function executeCommand(cmd: CommandResult): Promise<string> {
  try {
    switch (cmd.intent) {
      case "LIST_MEETUPS": {
        const meetups = await getMeetups();
        if (!meetups || meetups.length === 0) return "📋 등록된 밋업이 없습니다.";
        const list = meetups.slice(0, 10).map((m: any) => 
          `• ${m.title} (${m.status || "모집중"}) - ${m.location || "미정"}`
        ).join("\n");
        return `📋 밋업 목록 (${meetups.length}개):\n\n${list}${meetups.length > 10 ? `\n\n...외 ${meetups.length - 10}개` : ""}`;
      }

      case "LIST_PARTICIPANTS": {
        const filters: any = {};
        if (cmd.data?.meetupId) filters.meetupId = cmd.data.meetupId;
        if (cmd.data?.status) filters.status = cmd.data.status;
        const regs = await getRegistrations(filters);
        if (!regs || regs.length === 0) return "👥 참가자가 없습니다.";
        const list = regs.slice(0, 15).map((r: any) => 
          `• ${r.name} (${r.status || "대기"}) ${r.phone || ""}`
        ).join("\n");
        return `👥 참가자 목록 (${regs.length}명):\n\n${list}${regs.length > 15 ? `\n\n...외 ${regs.length - 15}명` : ""}`;
      }

      case "GET_STATS": {
        const meetups = await getMeetups();
        const regs = await getRegistrations({});
        const flights = await getFlightSchedules();
        const uploadStats = await getTelegramUploadStats();
        return `📊 현황 통계:\n\n` +
          `📋 밋업: ${meetups?.length || 0}개\n` +
          `👥 참가자: ${regs?.length || 0}명\n` +
          `✈️ 항공편: ${flights?.length || 0}건\n` +
          `📥 텔레그램 업로드: ${uploadStats.total}건 (대기: ${uploadStats.pending}, 파싱: ${uploadStats.parsed}, 적용: ${uploadStats.applied})`;
      }

      case "REGISTER_PARTICIPANTS": {
        if (!cmd.data?.participants || !Array.isArray(cmd.data.participants)) {
          return cmd.response;
        }
        const results: string[] = [];
        for (const p of cmd.data.participants) {
          try {
            await createRegistration({
              name: p.name || "미입력",
              phone: p.phone || "",
              messengerId: p.messengerId || "",
              locationType: p.locationType || "overseas",
              category: "meetup",
              status: "approved",
              meetupId: p.meetupId || cmd.data.meetupId,
              notes: [p.passportNumber, p.birthDate, p.gender, p.nationality].filter(Boolean).join(" | ") || undefined,
            });
            results.push(`✅ ${p.name}`);
          } catch (e: any) {
            results.push(`❌ ${p.name}: ${e.message || "등록 실패"}`);
          }
        }
        return `👥 참가자 등록 결과:\n\n${results.join("\n")}`;
      }

      case "ASSIGN_FLIGHT": {
        if (!cmd.data?.flights || !Array.isArray(cmd.data.flights)) {
          return cmd.response;
        }
        const results: string[] = [];
        for (const f of cmd.data.flights) {
          try {
            await createFlightSchedule({
              meetupId: f.meetupId || cmd.data.meetupId,
              flightNo: f.flightNo || "TBD",
              airline: f.airline,
              departureAirport: f.departureAirport,
              arrivalAirport: f.arrivalAirport,
              scheduledDeparture: f.departureTime ? new Date(f.departureTime) : new Date(),
              scheduledArrival: f.arrivalTime ? new Date(f.arrivalTime) : undefined,
            });
            results.push(`✅ ${f.flightNo} (${f.departureAirport}→${f.arrivalAirport})`);
          } catch (e: any) {
            results.push(`❌ ${f.flightNo}: ${e.message || "등록 실패"}`);
          }
        }
        return `✈️ 항공편 등록 결과:\n\n${results.join("\n")}`;
      }

      case "ASSIGN_HOTEL": {
        if (!cmd.data?.hotels || !Array.isArray(cmd.data.hotels)) {
          return cmd.response;
        }
        const results: string[] = [];
        for (const h of cmd.data.hotels) {
          try {
            await createAccommodation({
              meetupId: h.meetupId || cmd.data.meetupId,
              hotelName: h.hotelName || "미정",
              roomType: h.roomType || "twin",
              checkIn: h.checkIn ? new Date(h.checkIn) : undefined,
              checkOut: h.checkOut ? new Date(h.checkOut) : undefined,
              notes: h.notes,
            });
            results.push(`✅ ${h.hotelName}`);
          } catch (e: any) {
            results.push(`❌ ${h.hotelName}: ${e.message || "등록 실패"}`);
          }
        }
        return `🏨 숙소 등록 결과:\n\n${results.join("\n")}`;
      }

      case "SEARCH": {
        const keyword = cmd.data?.keyword || "";
        if (!keyword) return "🔍 검색어를 입력해주세요.";
        const regs = await getRegistrations({});
        const matched = (regs || []).filter((r: any) => 
          (r.name || "").toLowerCase().includes(keyword.toLowerCase()) ||
          (r.phone || "").includes(keyword) ||
          (r.passportNumber || "").includes(keyword.toUpperCase())
        );
        if (matched.length === 0) return `🔍 "${keyword}" 검색 결과가 없습니다.`;
        const list = matched.slice(0, 10).map((r: any) => 
          `• ${r.name} | ${r.phone || "-"} | ${r.status || "대기"}`
        ).join("\n");
        return `🔍 "${keyword}" 검색 결과 (${matched.length}건):\n\n${list}`;
      }

      case "OCR_PASSPORT": {
        return cmd.response + "\n\n📸 이미지가 백오피스에 저장되었습니다. 관리자가 확인 후 처리합니다.";
      }

      case "TRAVEL_INFO": {
        return cmd.response;
      }

      case "HELP": {
        return "🤖 AI 명령 도우미\n\n" +
          "📝 사용 가능한 명령:\n\n" +
          "👥 참가자 관리:\n" +
          "• \"김철수 M12345678 KOR 1990-01-01 남 만료 2030-12-31 등록해줘\"\n" +
          "• \"참가자 목록 보여줘\"\n" +
          "• \"김철수 검색\"\n\n" +
          "📋 밋업 관리:\n" +
          "• \"밋업 목록\"\n" +
          "• \"하롱베이 Xplay 행사 5/10~5/13 생성\"\n\n" +
          "✈️ 항공편/숙소:\n" +
          "• \"OZ733 ICN→HAN 08:00-10:50 등록\"\n" +
          "• \"호텔 Grand Plaza 5/10~5/13 배정\"\n\n" +
          "📊 현황:\n" +
          "• \"통계 보여줘\"\n" +
          "• \"현황 알려줘\"\n\n" +
          "📸 이미지:\n" +
          "• 여권/항공권 사진 전송 → 자동 OCR 분석\n\n" +
          "💡 자유롭게 한국어로 말씀하시면 AI가 이해합니다!";
      }

      default:
        return cmd.response;
    }
  } catch (e) {
    console.error("[TelegramWebhook] Execute command error:", e);
    return "⚠️ 명령 실행 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}

// ── Webhook Handler ──────────────────────────────────────

webhookRouter.post("/", async (req: Request, res: Response) => {
  try {
    const update = req.body;
    
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

    // Handle basic bot commands
    if (rawText.startsWith("/")) {
      const command = rawText.split(" ")[0].toLowerCase();
      switch (command) {
        case "/start":
          await sendBotReply(config.botToken, chatId, 
            "🛫 Meetup Travel AI 어시스턴트\n\n" +
            "자연어로 모든 백오피스 기능을 실행할 수 있습니다.\n\n" +
            "💡 예시:\n" +
            "• \"참가자 목록 보여줘\"\n" +
            "• \"김철수 M12345 KOR 1990-01-01 등록\"\n" +
            "• \"밋업 현황 알려줘\"\n" +
            "• 여권/항공권 사진 전송\n\n" +
            "/help - 상세 도움말\n" +
            "/stats - 현황 통계"
          );
          return res.json({ ok: true, command: "start" });
        
        case "/help":
          const helpCmd = await executeCommand({ intent: "HELP", action: "", response: "" });
          await sendBotReply(config.botToken, chatId, helpCmd);
          return res.json({ ok: true, command: "help" });
        
        case "/stats": {
          const statsCmd = await executeCommand({ intent: "GET_STATS", action: "", response: "" });
          await sendBotReply(config.botToken, chatId, statsCmd);
          return res.json({ ok: true, command: "stats" });
        }

        case "/meetups": {
          const meetupsCmd = await executeCommand({ intent: "LIST_MEETUPS", action: "", response: "" });
          await sendBotReply(config.botToken, chatId, meetupsCmd);
          return res.json({ ok: true, command: "meetups" });
        }

        case "/participants": {
          const partCmd = await executeCommand({ intent: "LIST_PARTICIPANTS", action: "", response: "", data: {} });
          await sendBotReply(config.botToken, chatId, partCmd);
          return res.json({ ok: true, command: "participants" });
        }

        default:
          // Fall through to AI processing for unknown commands
          rawText = rawText.substring(1); // Remove the / prefix
          break;
      }
    }

    // ── AI Natural Language Processing ──────────────────────
    const commandResult = await processNaturalLanguageCommand(rawText, rawFileUrl);
    
    // Save to telegram_uploads for audit trail
    if (commandResult.shouldSave) {
      const uploadId = await createTelegramUpload({
        uploadedBy: `@${fromUser} (${fromUserId})`,
        telegramMessageId: messageId,
        telegramChatId: chatId,
        rawText: rawText || undefined,
        rawFileUrl: rawFileUrl || undefined,
        rawFileType,
        status: "parsed",
        parsedType: commandResult.intent.toLowerCase() as any,
        parsedData: commandResult.data,
        parsedConfidence: 90,
        parsedSummary: commandResult.action,
      });

      // Execute the command
      const executionResult = await executeCommand(commandResult);
      
      // Update status based on execution
      if (commandResult.intent === "REGISTER_PARTICIPANTS" || 
          commandResult.intent === "ASSIGN_FLIGHT" || 
          commandResult.intent === "ASSIGN_HOTEL") {
        await updateTelegramUpload(uploadId, { status: "applied" });
      }

      // Create real-time notification for backoffice
      const notifType = commandResult.intent === "REGISTER_PARTICIPANTS" ? "success" :
        commandResult.intent === "ASSIGN_FLIGHT" ? "success" :
        commandResult.intent === "ASSIGN_HOTEL" ? "success" :
        commandResult.intent === "OCR_PASSPORT" ? "warning" : "info";
      await createTelegramNotification({
        type: notifType,
        title: `텔레그램: ${commandResult.action || commandResult.intent}`,
        message: `@${fromUser}: ${rawText?.substring(0, 200) || '이미지 전송'}\n\n결과: ${executionResult.substring(0, 300)}`,
        sourceUploadId: uploadId,
      });

      // Send response
      await sendBotReply(config.botToken, chatId, executionResult);
      return res.json({ ok: true, uploadId, intent: commandResult.intent });
    } else {
      // Non-saving commands (queries, help, etc.)
      const executionResult = await executeCommand(commandResult);
      await sendBotReply(config.botToken, chatId, executionResult);
      return res.json({ ok: true, intent: commandResult.intent });
    }

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
    // Telegram has a 4096 char limit per message
    if (text.length > 4000) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += 4000) {
        chunks.push(text.substring(i, i + 4000));
      }
      for (const chunk of chunks) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "HTML" }),
        });
      }
    } else {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
    }
  } catch (e) {
    console.error("[TelegramWebhook] Reply failed:", e);
  }
}

export function createTelegramWebhookRouter() {
  return webhookRouter;
}
