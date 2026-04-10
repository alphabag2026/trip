import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = dirname(__filename_esm);

// Load fonts once
const fontBold = readFileSync(join(__dirname_esm, "fonts", "NotoSansKR-Bold.otf"));
const fontRegular = readFileSync(join(__dirname_esm, "fonts", "NotoSansKR-Regular.otf"));

interface InvitationData {
  meetupTitle: string;
  meetupType: string;
  location: string;
  country: string;
  dateRange: string;
  maxParticipants?: number;
  description?: string;
  qrUrl: string;
  lang?: "ko" | "en" | "zh";
}

const LABELS: Record<string, Record<string, string>> = {
  ko: { invitation: "초대장", location: "장소", date: "일정", participants: "정원", scanToJoin: "QR 스캔하여 참가 신청", poweredBy: "Alpha Trip" },
  en: { invitation: "INVITATION", location: "Location", date: "Schedule", participants: "Capacity", scanToJoin: "Scan QR to Register", poweredBy: "Alpha Trip" },
  zh: { invitation: "邀请函", location: "地点", date: "日程", participants: "名额", scanToJoin: "扫描二维码报名", poweredBy: "Alpha Trip" },
};

// Helper to create a satori element
function el(tag: string, style: Record<string, any>, children?: any): any {
  return { type: tag, props: { style, children } };
}

function infoRow(emoji: string, label: string, value: string, bgColor: string) {
  return el("div", { display: "flex", alignItems: "center", gap: "12px" }, [
    el("div", {
      width: "36px", height: "36px", borderRadius: "10px",
      background: bgColor, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: "16px",
    }, emoji),
    el("div", { display: "flex", flexDirection: "column" }, [
      el("div", { fontSize: "11px", color: "#64748b", marginBottom: "2px" }, label),
      el("div", { fontSize: "16px", color: "#e2e8f0" }, value),
    ]),
  ]);
}

export async function generateInvitationImage(data: InvitationData): Promise<Buffer> {
  const lang = data.lang || "ko";
  const labels = LABELS[lang] || LABELS.ko;

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(data.qrUrl, {
    width: 200, margin: 1,
    color: { dark: "#1e293b", light: "#ffffff" },
  });

  const WIDTH = 800;
  const HEIGHT = 1000;

  // Build info rows
  const infoRows: any[] = [];
  if (data.location || data.country) {
    const locText = `${data.location || ""}${data.country ? ` · ${data.country}` : ""}`;
    infoRows.push(infoRow("📍", labels.location, locText, "rgba(59, 130, 246, 0.15)"));
  }
  infoRows.push(infoRow("📅", labels.date, data.dateRange, "rgba(139, 92, 246, 0.15)"));
  if (data.maxParticipants) {
    infoRows.push(infoRow("👥", labels.participants, `${data.maxParticipants}`, "rgba(236, 72, 153, 0.15)"));
  }

  // Build children array for root
  const rootChildren: any[] = [];

  // Top decorative bar
  rootChildren.push(el("div", {
    width: "100%", height: "6px",
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
  }));

  // Header section
  rootChildren.push(el("div", {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "40px 50px 20px",
  }, [
    el("div", {
      fontSize: "14px", letterSpacing: "6px", color: "#94a3b8",
      textTransform: "uppercase", marginBottom: "12px",
    }, labels.invitation),
    el("div", {
      fontSize: "32px", fontWeight: 700, textAlign: "center",
      lineHeight: "1.3", maxWidth: "650px", color: "#60a5fa",
    }, data.meetupTitle),
    el("div", { display: "flex", marginTop: "16px" },
      el("div", {
        background: "rgba(59, 130, 246, 0.2)",
        border: "1px solid rgba(59, 130, 246, 0.4)",
        borderRadius: "20px", padding: "6px 20px",
        fontSize: "13px", color: "#93c5fd",
      }, data.meetupType),
    ),
  ]));

  // Divider
  rootChildren.push(el("div", {
    width: "80%", height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.3), transparent)",
    margin: "10px auto",
  }));

  // Info section
  rootChildren.push(el("div", {
    display: "flex", flexDirection: "column",
    padding: "20px 60px", gap: "16px",
  }, infoRows));

  // Description (if available)
  if (data.description) {
    const descText = data.description.slice(0, 200) + (data.description.length > 200 ? "..." : "");
    rootChildren.push(el("div", {
      display: "flex", margin: "0 60px", padding: "16px 20px",
      background: "rgba(255,255,255,0.05)", borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.08)",
    },
      el("div", {
        fontSize: "13px", color: "#94a3b8", lineHeight: "1.6",
      }, descText),
    ));
  }

  // Spacer
  rootChildren.push(el("div", { flex: "1", display: "flex" }));

  // QR Section
  rootChildren.push(el("div", {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "20px 50px 30px",
  }, [
    el("div", {
      display: "flex", background: "#ffffff", borderRadius: "16px",
      padding: "12px",
    },
      { type: "img", props: { src: qrDataUrl, width: 160, height: 160, style: { borderRadius: "8px" } } },
    ),
    el("div", {
      fontSize: "12px", color: "#64748b", marginTop: "12px", letterSpacing: "1px",
    }, labels.scanToJoin),
  ]));

  // Footer
  rootChildren.push(el("div", {
    display: "flex", justifyContent: "center", alignItems: "center",
    padding: "16px", borderTop: "1px solid rgba(148,163,184,0.1)",
  },
    el("div", {
      fontSize: "11px", color: "#475569", letterSpacing: "2px",
    }, `✈ ${labels.poweredBy}`),
  ));

  const svg = await satori(
    el("div", {
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      fontFamily: "NotoSansKR", color: "#ffffff", padding: "0",
    }, rootChildren) as any,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "NotoSansKR", data: fontRegular, weight: 400, style: "normal" as const },
        { name: "NotoSansKR", data: fontBold, weight: 700, style: "normal" as const },
      ],
    }
  );

  // Convert SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH * 2 },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
