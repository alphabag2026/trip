import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// Try multiple font directories (handles both dev and production Docker paths)
function findFontDir(): string {
  const candidates = [
    path.join(__dirname_esm, "fonts"),
    path.join(process.cwd(), "server", "fonts"),
    path.join(process.cwd(), "dist", "fonts"),
    path.join(__dirname_esm, "..", "server", "fonts"),
    path.join(process.cwd(), "fonts"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "NotoSansKR-Regular.ttf"))) {
      console.log(`[PassportPdf] Font found at: ${dir}`);
      return dir;
    }
  }
  console.warn(`[PassportPdf] No font directory found, tried: ${candidates.join(", ")}`);
  return candidates[0]; // fallback
}
const FONT_DIR = findFontDir();
const FONT_REGULAR = path.join(FONT_DIR, "NotoSansKR-Regular.ttf");

// Check if font file exists at startup
function getFontPath(): string {
  if (fs.existsSync(FONT_REGULAR)) return FONT_REGULAR;
  return "Helvetica";
}

export interface PassportEntry {
  stt: number;
  fullName: string;
  passportNumber: string;
  birthYear?: string;
  birthDate?: string;
  gender?: "M" | "F" | string;
  nationality?: string;
  phone?: string;
  expiryDate?: string;
  passportImageUrl?: string; // URL to passport scan image
}

export interface PassportPdfOptions {
  title: string;
  format: "vietnam_police" | "cruise" | "generic";
  entries: PassportEntry[];
  meetupName?: string;
  date?: string;
  includeImages?: boolean; // Whether to include passport images as separate pages
}

/**
 * Download an image from URL and return as Buffer.
 * Returns null if download fails.
 */
async function downloadImage(inputUrl: string): Promise<Buffer | null> {
  let url = inputUrl;
  // For /manus-storage/ relative paths, resolve via storageGet to get a signed download URL
  if (url.startsWith("/manus-storage/")) {
    try {
      const { storageGet } = await import("./storage");
      // Extract the key from /manus-storage/filename.jpg
      const storageKey = url.replace("/manus-storage/", "");
      const result = await storageGet(storageKey);
      url = result.url;
    } catch (e) {
      console.error(`[PassportPdf] Failed to resolve storage URL for ${url}:`, e);
      // Fallback: try with forge API URL
      const baseUrl = process.env.BUILT_IN_FORGE_API_URL || "";
      if (baseUrl) url = baseUrl.replace(/\/+$/, "") + url;
    }
  } else if (url.startsWith("/")) {
    // Other relative URLs
    const baseUrl = process.env.BUILT_IN_FORGE_API_URL || process.env.OAUTH_SERVER_URL || "";
    if (baseUrl) url = baseUrl.replace(/\/+$/, "") + url;
  }
  console.log(`[PassportPdf] Downloading image: ${url}`);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => { console.log(`[PassportPdf] Image download timeout: ${url}`); resolve(null); }, 15000);
    try {
      const client = url.startsWith("https") ? https : http;
      client.get(url, (res) => {
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
        res.on("error", () => {
          clearTimeout(timeout);
          resolve(null);
        });
      }).on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * Generate a passport list PDF in the specified format.
 * Returns a Buffer containing the PDF data.
 */
export async function generatePassportPdf(options: PassportPdfOptions): Promise<Buffer> {
  const { title, format, entries, meetupName, date, includeImages = false } = options;

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const fontPath = getFontPath();
  const useCustomFont = fontPath !== "Helvetica";

  if (useCustomFont) {
    doc.registerFont("Korean", fontPath);
    doc.font("Korean");
  } else {
    doc.font("Helvetica");
  }

  if (format === "vietnam_police") {
    await renderVietnamPoliceFormat(doc, { title, entries, meetupName, date, useCustomFont });
  } else if (format === "cruise") {
    await renderCruiseFormat(doc, { title, entries, meetupName, date, useCustomFont });
  } else {
    await renderGenericFormat(doc, { title, entries, meetupName, date, useCustomFont });
  }

  // Add passport images as separate pages if requested
  if (includeImages) {
    await renderPassportImages(doc, entries, useCustomFont);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// ── Passport Images Pages (A4 Portrait, 4 per page in 2x2 grid) ──────────
async function renderPassportImages(doc: PDFKit.PDFDocument, entries: PassportEntry[], useCustomFont: boolean) {
  const entriesWithImages = entries.filter((e) => e.passportImageUrl);
  if (entriesWithImages.length === 0) return;

  // A4 portrait: 595.28 x 841.89 points
  const margin = 30;
  const pageW = 595.28 - margin * 2;
  const pageH = 841.89 - margin * 2;
  const cols = 2;
  const rows = 2;
  const cellGap = 12;
  const cellW = (pageW - cellGap) / cols;
  const cellH = (pageH - cellGap) / rows;
  const labelH = 32; // space for name + passport number
  const imgMaxW = cellW - 10;
  const imgMaxH = cellH - labelH - 10;

  let imagesOnPage = 0;
  let needNewPage = true;

  for (const entry of entriesWithImages) {
    if (!entry.passportImageUrl) continue;

    const imgBuffer = await downloadImage(entry.passportImageUrl);
    if (!imgBuffer) continue;

    if (needNewPage || imagesOnPage >= 4) {
      doc.addPage({ size: "A4", layout: "portrait", margins: { top: margin, bottom: margin, left: margin, right: margin } });
      imagesOnPage = 0;
      needNewPage = false;
    }

    // Calculate grid position (0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right)
    const col = imagesOnPage % cols;
    const row = Math.floor(imagesOnPage / cols);
    const cellX = margin + col * (cellW + cellGap);
    const cellY = margin + row * (cellH + cellGap);

    // Draw cell border with rounded corners
    doc.save();
    doc.roundedRect(cellX, cellY, cellW, cellH, 4).lineWidth(0.5).strokeColor("#cccccc").stroke();
    doc.restore();

    // Name and passport number label at top of cell
    if (useCustomFont) doc.font("Korean");
    doc.fontSize(9).fillColor("#000000");
    doc.text(`${entry.stt}. ${entry.fullName}`, cellX + 5, cellY + 5, { width: cellW - 10, lineBreak: false });
    doc.fontSize(8).fillColor("#555555");
    doc.text(`${entry.passportNumber}${entry.birthDate ? " | " + entry.birthDate : ""}${entry.gender ? " | " + entry.gender : ""}`, cellX + 5, cellY + 18, { width: cellW - 10, lineBreak: false });

    // Draw passport image centered in remaining cell area
    try {
      doc.image(imgBuffer, cellX + 5, cellY + labelH, {
        fit: [imgMaxW, imgMaxH],
        align: "center",
        valign: "center",
      });
    } catch (e) {
      doc.fontSize(8).fillColor("#999999");
      doc.text("(이미지를 불러올 수 없습니다)", cellX + 5, cellY + labelH + 20);
    }

    imagesOnPage++;
  }
}

interface RenderOptions {
  title: string;
  entries: PassportEntry[];
  meetupName?: string;
  date?: string;
  useCustomFont: boolean;
}

// ── Vietnam Police Format (DANH SÁCH KHÁCH) ──────────────────
async function renderVietnamPoliceFormat(doc: PDFKit.PDFDocument, opts: RenderOptions) {
  const { title, entries, meetupName, date, useCustomFont } = opts;
  const pageW = doc.page.width - 80;

  doc.fontSize(18).fillColor("#cc0000");
  doc.text(title || "DANH SÁCH KHÁCH", 40, 40, { align: "center", width: pageW });
  doc.moveDown(0.5);

  if (meetupName) {
    doc.fontSize(10).fillColor("#333333");
    doc.text(`행사: ${meetupName}${date ? ` | 날짜: ${date}` : ""}`, { align: "center", width: pageW });
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 10;
  const colWidths = [35, 150, 120, 60, 60, 80, 160];
  const headers = ["STT", "Họ và tên", "Số CCCD/Hộ chiếu/\nĐịnh danh", "Năm sinh\nNam", "Năm sinh\nNữ", "Quốc tịch", "Địa chỉ, Số Điện thoại\nhành khách (전화번호)"];

  let x = 40;
  doc.rect(40, tableTop, pageW, 35).fill("#e8f5e9").stroke("#000000");
  doc.fillColor("#000000").fontSize(8);

  x = 40;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 3, tableTop + 5, { width: colWidths[i] - 6, align: "center" });
    x += colWidths[i];
  }

  x = 40;
  for (let i = 0; i <= headers.length; i++) {
    doc.moveTo(x, tableTop).lineTo(x, tableTop + 35).stroke();
    x += colWidths[i] || 0;
  }
  doc.moveTo(40, tableTop).lineTo(40 + pageW, tableTop).stroke();
  doc.moveTo(40, tableTop + 35).lineTo(40 + pageW, tableTop + 35).stroke();

  let rowY = tableTop + 35;
  const rowHeight = 22;

  for (const entry of entries) {
    if (rowY + rowHeight > doc.page.height - 50) {
      doc.addPage({ size: "A4", layout: "landscape" });
      rowY = 40;
    }

    x = 40;
    doc.fontSize(9).fillColor("#000000");
    doc.rect(40, rowY, pageW, rowHeight).stroke();

    const values = [
      String(entry.stt),
      entry.fullName || "",
      entry.passportNumber || "",
      entry.gender === "M" ? (entry.birthYear || entry.birthDate?.substring(0, 4) || "") : "",
      entry.gender === "F" ? (entry.birthYear || entry.birthDate?.substring(0, 4) || "") : "",
      entry.nationality || "",
      entry.phone || "",
    ];

    for (let i = 0; i < values.length; i++) {
      doc.text(values[i], x + 3, rowY + 5, { width: colWidths[i] - 6, align: i === 0 ? "center" : "left" });
      doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();
      x += colWidths[i];
    }
    doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();

    rowY += rowHeight;
  }
}

// ── Cruise Format ──────────────────────────────────────────
async function renderCruiseFormat(doc: PDFKit.PDFDocument, opts: RenderOptions) {
  const { title, entries, meetupName, date, useCustomFont } = opts;
  const pageW = doc.page.width - 80;

  doc.fontSize(16).fillColor("#003366");
  doc.text(title || "PASSENGER LIST", 40, 40, { align: "center", width: pageW });
  doc.moveDown(0.3);

  if (meetupName) {
    doc.fontSize(10).fillColor("#333333");
    doc.text(`Event: ${meetupName}${date ? ` | Date: ${date}` : ""}`, { align: "center", width: pageW });
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 10;
  const colWidths = [30, 140, 100, 80, 50, 80, 80, 100];
  const headers = ["No.", "Full Name", "Passport No.", "Date of Birth", "Sex", "Nationality", "Expiry Date", "Phone"];

  let x = 40;
  doc.rect(40, tableTop, pageW, 25).fill("#003366");
  doc.fillColor("#ffffff").fontSize(8);

  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 3, tableTop + 7, { width: colWidths[i] - 6, align: "center" });
    x += colWidths[i];
  }

  let rowY = tableTop + 25;
  const rowHeight = 20;

  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    if (rowY + rowHeight > doc.page.height - 50) {
      doc.addPage({ size: "A4", layout: "landscape" });
      rowY = 40;
    }

    const bgColor = idx % 2 === 0 ? "#f8f9fa" : "#ffffff";
    doc.rect(40, rowY, pageW, rowHeight).fill(bgColor);
    doc.rect(40, rowY, pageW, rowHeight).stroke("#cccccc");

    x = 40;
    doc.fillColor("#000000").fontSize(8);

    const values = [
      String(entry.stt),
      entry.fullName || "",
      entry.passportNumber || "",
      entry.birthDate || "",
      entry.gender || "",
      entry.nationality || "",
      entry.expiryDate || "",
      entry.phone || "",
    ];

    for (let i = 0; i < values.length; i++) {
      doc.text(values[i], x + 3, rowY + 5, { width: colWidths[i] - 6, align: i === 0 ? "center" : "left" });
      x += colWidths[i];
    }

    rowY += rowHeight;
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor("#666666");
  doc.text(`Total Passengers: ${entries.length}`, 40, rowY + 20);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 40, rowY + 32);
}

// ── Generic Format ─────────────────────────────────────────
async function renderGenericFormat(doc: PDFKit.PDFDocument, opts: RenderOptions) {
  const { title, entries, meetupName, date, useCustomFont } = opts;
  const pageW = doc.page.width - 80;

  doc.fontSize(16).fillColor("#000000");
  doc.text(title || "여권 정보 목록", 40, 40, { align: "center", width: pageW });
  doc.moveDown(0.3);

  if (meetupName) {
    doc.fontSize(10).fillColor("#333333");
    doc.text(`행사: ${meetupName}${date ? ` | 날짜: ${date}` : ""}`, { align: "center", width: pageW });
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 10;
  const colWidths = [30, 140, 100, 80, 50, 80, 80, 100];
  const headers = ["번호", "이름", "여권번호", "생년월일", "성별", "국적", "만료일", "전화번호"];

  let x = 40;
  doc.rect(40, tableTop, pageW, 25).fill("#1a1a2e");
  doc.fillColor("#ffffff").fontSize(8);

  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 3, tableTop + 7, { width: colWidths[i] - 6, align: "center" });
    x += colWidths[i];
  }

  let rowY = tableTop + 25;
  const rowHeight = 20;

  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    if (rowY + rowHeight > doc.page.height - 50) {
      doc.addPage({ size: "A4", layout: "landscape" });
      rowY = 40;
    }

    const bgColor = idx % 2 === 0 ? "#f5f5f5" : "#ffffff";
    doc.rect(40, rowY, pageW, rowHeight).fill(bgColor);
    doc.rect(40, rowY, pageW, rowHeight).stroke("#dddddd");

    x = 40;
    doc.fillColor("#000000").fontSize(8);

    const genderLabel = entry.gender === "M" ? "남" : entry.gender === "F" ? "여" : entry.gender || "";
    const values = [
      String(entry.stt),
      entry.fullName || "",
      entry.passportNumber || "",
      entry.birthDate || "",
      genderLabel,
      entry.nationality || "",
      entry.expiryDate || "",
      entry.phone || "",
    ];

    for (let i = 0; i < values.length; i++) {
      doc.text(values[i], x + 3, rowY + 5, { width: colWidths[i] - 6, align: i === 0 ? "center" : "left" });
      x += colWidths[i];
    }

    rowY += rowHeight;
  }

  doc.fontSize(8).fillColor("#666666");
  doc.text(`총 인원: ${entries.length}명 | 생성일: ${new Date().toISOString().slice(0, 10)}`, 40, rowY + 20);
}
