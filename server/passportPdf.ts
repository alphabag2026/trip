import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const FONT_DIR = path.join(__dirname, "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "NotoSansKR-Regular.ttf");

// Check if font file exists at startup
function getFontPath(): string {
  if (fs.existsSync(FONT_REGULAR)) return FONT_REGULAR;
  // Fallback: use Helvetica (no Korean support but won't crash)
  return "Helvetica";
}

export interface PassportEntry {
  stt: number; // 순번
  fullName: string; // 이름 (영문 또는 현지어)
  passportNumber: string; // 여권번호/CCCD
  birthYear?: string; // 출생년도
  birthDate?: string; // 생년월일 full
  gender?: "M" | "F" | string; // 성별
  nationality?: string; // 국적
  phone?: string; // 전화번호
  expiryDate?: string; // 여권 만료일
}

export interface PassportPdfOptions {
  title: string; // 문서 제목 (예: "DANH SÁCH KHÁCH DD-MM")
  format: "vietnam_police" | "cruise" | "generic"; // 출력 형식
  entries: PassportEntry[];
  meetupName?: string; // 행사명
  date?: string; // 날짜
}

/**
 * Generate a passport list PDF in the specified format.
 * Returns a Buffer containing the PDF data.
 */
export async function generatePassportPdf(options: PassportPdfOptions): Promise<Buffer> {
  const { title, format, entries, meetupName, date } = options;

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

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
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
  const pageW = doc.page.width - 80; // margins

  // Title
  doc.fontSize(18).fillColor("#cc0000");
  doc.text(title || "DANH SÁCH KHÁCH", 40, 40, { align: "center", width: pageW });
  doc.moveDown(0.5);

  if (meetupName) {
    doc.fontSize(10).fillColor("#333333");
    doc.text(`행사: ${meetupName}${date ? ` | 날짜: ${date}` : ""}`, { align: "center", width: pageW });
    doc.moveDown(0.5);
  }

  // Table header
  const tableTop = doc.y + 10;
  const colWidths = [35, 150, 120, 60, 60, 80, 160]; // STT, Name, Passport, BirthM, BirthF, Nationality, Phone
  const headers = ["STT", "Họ và tên", "Số CCCD/Hộ chiếu/\nĐịnh danh", "Năm sinh\nNam", "Năm sinh\nNữ", "Quốc tịch", "Địa chỉ, Số Điện thoại\nhành khách (전화번호)"];

  let x = 40;
  // Header background
  doc.rect(40, tableTop, pageW, 35).fill("#e8f5e9").stroke("#000000");
  doc.fillColor("#000000").fontSize(8);

  x = 40;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 3, tableTop + 5, { width: colWidths[i] - 6, align: "center" });
    x += colWidths[i];
  }

  // Draw header borders
  x = 40;
  for (let i = 0; i <= headers.length; i++) {
    doc.moveTo(x, tableTop).lineTo(x, tableTop + 35).stroke();
    x += colWidths[i] || 0;
  }
  doc.moveTo(40, tableTop).lineTo(40 + pageW, tableTop).stroke();
  doc.moveTo(40, tableTop + 35).lineTo(40 + pageW, tableTop + 35).stroke();

  // Table rows
  let rowY = tableTop + 35;
  const rowHeight = 22;

  for (const entry of entries) {
    if (rowY + rowHeight > doc.page.height - 50) {
      doc.addPage({ size: "A4", layout: "landscape" });
      rowY = 40;
    }

    x = 40;
    doc.fontSize(9).fillColor("#000000");

    // Row border
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
      // Column border
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

  // Title
  doc.fontSize(16).fillColor("#003366");
  doc.text(title || "PASSENGER LIST", 40, 40, { align: "center", width: pageW });
  doc.moveDown(0.3);

  if (meetupName) {
    doc.fontSize(10).fillColor("#333333");
    doc.text(`Event: ${meetupName}${date ? ` | Date: ${date}` : ""}`, { align: "center", width: pageW });
    doc.moveDown(0.5);
  }

  // Table header
  const tableTop = doc.y + 10;
  const colWidths = [30, 140, 100, 80, 50, 80, 80, 100]; // No, Name, Passport, DOB, Gender, Nationality, Expiry, Phone
  const headers = ["No.", "Full Name", "Passport No.", "Date of Birth", "Sex", "Nationality", "Expiry Date", "Phone"];

  let x = 40;
  doc.rect(40, tableTop, pageW, 25).fill("#003366");
  doc.fillColor("#ffffff").fontSize(8);

  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 3, tableTop + 7, { width: colWidths[i] - 6, align: "center" });
    x += colWidths[i];
  }

  // Table rows
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

  // Footer
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
