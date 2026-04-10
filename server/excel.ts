import ExcelJS from "exceljs";

// ── Style Constants ──────────────────────────────────
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" },
  left: { style: "thin" }, right: { style: "thin" },
};

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  row.height = 28;
}

function styleDataRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number) {
  for (let i = startRow; i <= endRow; i++) {
    const row = ws.getRow(i);
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  }
}

// ── Template Generators ──────────────────────────────
export async function generatePickupTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("차량 등록");
  ws.columns = [
    { header: "차량명 *", key: "vehicleName", width: 20 },
    { header: "차량번호", key: "vehiclePlateNumber", width: 18 },
    { header: "차량색상", key: "vehicleColor", width: 12 },
    { header: "차량유형", key: "vehicleType", width: 12 },
    { header: "정원", key: "capacity", width: 8 },
    { header: "기사명", key: "driverName", width: 15 },
    { header: "기사 연락처", key: "driverPhone", width: 18 },
    { header: "픽업 장소", key: "pickupLocation", width: 25 },
    { header: "픽업 시간 (YYYY-MM-DD HH:mm)", key: "pickupTime", width: 28 },
  ];
  styleHeader(ws);
  // Sample row
  ws.addRow(["현대 스타렉스", "12가 3456", "흰색", "밴", 12, "홍길동", "010-1234-5678", "하노이 공항", "2025-04-15 14:00"]);
  ws.addRow(["토요타 알파드", "34나 5678", "검정", "세단", 4, "김철수", "010-9876-5432", "호텔 로비", "2025-04-15 15:30"]);
  styleDataRows(ws, 2, 3);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function generateAccommodationTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("숙소 등록");
  ws.columns = [
    { header: "호텔명 *", key: "hotelName", width: 25 },
    { header: "방 번호", key: "roomNumber", width: 12 },
    { header: "객실 유형 (single/double/twin/suite)", key: "roomType", width: 30 },
    { header: "층수", key: "floorNumber", width: 8 },
    { header: "체크인 (YYYY-MM-DD HH:mm)", key: "checkIn", width: 28 },
    { header: "체크아웃 (YYYY-MM-DD HH:mm)", key: "checkOut", width: 28 },
    { header: "비고", key: "notes", width: 30 },
  ];
  styleHeader(ws);
  ws.addRow(["롯데 하노이", "501", "twin", "5", "2025-04-15 14:00", "2025-04-18 12:00", "조식 포함"]);
  ws.addRow(["힐튼 하노이", "302", "double", "3", "2025-04-15 14:00", "2025-04-18 12:00", ""]);
  styleDataRows(ws, 2, 3);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function generateEventTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("이벤트 등록");
  ws.columns = [
    { header: "이벤트 제목 *", key: "title", width: 30 },
    { header: "시간 * (YYYY-MM-DD HH:mm)", key: "eventTime", width: 28 },
    { header: "종료 시간 (YYYY-MM-DD HH:mm)", key: "endTime", width: 28 },
    { header: "장소", key: "location", width: 25 },
    { header: "설명", key: "description", width: 40 },
    { header: "사전 알림 (분)", key: "reminderMinutes", width: 15 },
  ];
  styleHeader(ws);
  ws.addRow(["하롱베이 투어", "2025-04-16 08:00", "2025-04-16 18:00", "하롱베이 선착장", "크루즈 투어", 30]);
  ws.addRow(["환영 만찬", "2025-04-15 19:00", "2025-04-15 21:00", "호텔 레스토랑", "전체 참가자 환영 만찬", 10]);
  styleDataRows(ws, 2, 3);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function generateItineraryTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("여정표 등록");
  ws.columns = [
    { header: "일차 *", key: "dayNumber", width: 8 },
    { header: "날짜 (YYYY-MM-DD)", key: "date", width: 18 },
    { header: "시간 (HH:mm)", key: "time", width: 12 },
    { header: "활동 제목 *", key: "activityTitle", width: 25 },
    { header: "활동 설명", key: "activityDesc", width: 40 },
    { header: "장소", key: "location", width: 25 },
    { header: "교통편", key: "transport", width: 15 },
  ];
  styleHeader(ws);
  ws.addRow([1, "2025-04-15", "09:00", "인천 출발", "VN456편", "인천국제공항", "항공"]);
  ws.addRow([1, "2025-04-15", "14:00", "하노이 도착", "노이바이 공항", "노이바이 공항", "항공"]);
  ws.addRow([2, "2025-04-16", "08:00", "하롱베이 투어", "크루즈 투어", "하롱베이", "버스"]);
  ws.addRow([3, "2025-04-17", "10:00", "하노이 시내 관광", "호안끼엠 호수", "하노이", "도보"]);
  styleDataRows(ws, 2, 5);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function generateAttendeeTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("참가자 등록");
  ws.columns = [
    { header: "이름 *", key: "name", width: 15 },
    { header: "전화번호 *", key: "phone", width: 18 },
    { header: "메신저 ID", key: "messengerId", width: 18 },
    { header: "팀명", key: "teamName", width: 15 },
    { header: "카테고리 (domestic/international)", key: "category", width: 30 },
    { header: "목적지 국가", key: "country", width: 15 },
    { header: "비고", key: "notes", width: 30 },
  ];
  styleHeader(ws);
  ws.addRow(["홍길동", "010-1234-5678", "@hong", "A팀", "domestic", "베트남", ""]);
  ws.addRow(["John Smith", "+1-555-0123", "@john", "B팀", "international", "Vietnam", ""]);
  styleDataRows(ws, 2, 3);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Data Export Generators ──────────────────────────────
export async function exportPickupsToExcel(data: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("차량 배치");
  ws.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "밋업", key: "meetupTitle", width: 20 },
    { header: "차량명", key: "vehicleName", width: 20 },
    { header: "차량번호", key: "vehiclePlateNumber", width: 15 },
    { header: "차량색상", key: "vehicleColor", width: 10 },
    { header: "차량유형", key: "vehicleType", width: 10 },
    { header: "정원", key: "capacity", width: 8 },
    { header: "기사명", key: "driverName", width: 15 },
    { header: "기사 연락처", key: "driverPhone", width: 18 },
    { header: "픽업 장소", key: "pickupLocation", width: 25 },
    { header: "픽업 시간", key: "pickupTime", width: 20 },
    { header: "상태", key: "status", width: 10 },
    { header: "배정 인원", key: "assignedCount", width: 10 },
  ];
  styleHeader(ws);
  data.forEach((d) => {
    ws.addRow({
      ...d,
      pickupTime: d.pickupTime ? new Date(d.pickupTime).toLocaleString("ko-KR") : "",
      assignedCount: d.assignedRegistrationIds ? JSON.parse(d.assignedRegistrationIds).length : 0,
    });
  });
  styleDataRows(ws, 2, data.length + 1);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportAccommodationsToExcel(data: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("숙소 배치");
  ws.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "밋업", key: "meetupTitle", width: 20 },
    { header: "호텔명", key: "hotelName", width: 25 },
    { header: "방 번호", key: "roomNumber", width: 10 },
    { header: "객실 유형", key: "roomType", width: 12 },
    { header: "층수", key: "floorNumber", width: 8 },
    { header: "체크인", key: "checkIn", width: 20 },
    { header: "체크아웃", key: "checkOut", width: 20 },
    { header: "배정 인원", key: "assignedCount", width: 10 },
    { header: "비고", key: "notes", width: 30 },
  ];
  styleHeader(ws);
  data.forEach((d) => {
    ws.addRow({
      ...d,
      checkIn: d.checkIn ? new Date(d.checkIn).toLocaleString("ko-KR") : "",
      checkOut: d.checkOut ? new Date(d.checkOut).toLocaleString("ko-KR") : "",
      assignedCount: d.assignedRegistrationIds ? JSON.parse(d.assignedRegistrationIds).length : 0,
    });
  });
  styleDataRows(ws, 2, data.length + 1);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportEventsToExcel(data: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("스케줄 이벤트");
  ws.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "이벤트 제목", key: "title", width: 30 },
    { header: "시간", key: "eventTime", width: 20 },
    { header: "종료 시간", key: "endTime", width: 20 },
    { header: "장소", key: "location", width: 25 },
    { header: "설명", key: "description", width: 40 },
    { header: "사전 알림(분)", key: "reminderMinutes", width: 12 },
  ];
  styleHeader(ws);
  data.forEach((d) => {
    ws.addRow({
      ...d,
      eventTime: d.eventTime ? new Date(d.eventTime).toLocaleString("ko-KR") : "",
      endTime: d.endTime ? new Date(d.endTime).toLocaleString("ko-KR") : "",
    });
  });
  styleDataRows(ws, 2, data.length + 1);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportItinerariesToExcel(data: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("여정표");
  ws.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "여정표 제목", key: "title", width: 25 },
    { header: "밋업", key: "meetupTitle", width: 20 },
    { header: "총 일수", key: "totalDays", width: 8 },
    { header: "생성일", key: "createdAt", width: 20 },
  ];
  styleHeader(ws);
  data.forEach((d) => {
    const days = d.days ? (typeof d.days === "string" ? JSON.parse(d.days) : d.days) : [];
    ws.addRow({
      id: d.id,
      title: d.title,
      meetupTitle: d.meetupTitle || "",
      totalDays: days.length,
      createdAt: d.createdAt ? new Date(d.createdAt).toLocaleString("ko-KR") : "",
    });
  });
  styleDataRows(ws, 2, data.length + 1);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportAttendeesToExcel(data: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("참가자 목록");
  ws.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "이름", key: "name", width: 15 },
    { header: "전화번호", key: "phone", width: 18 },
    { header: "메신저 ID", key: "messengerId", width: 18 },
    { header: "팀명", key: "teamName", width: 15 },
    { header: "카테고리", key: "category", width: 12 },
    { header: "상태", key: "status", width: 10 },
    { header: "밋업", key: "meetupTitle", width: 20 },
    { header: "신청일", key: "createdAt", width: 20 },
  ];
  styleHeader(ws);
  data.forEach((d) => {
    ws.addRow({
      ...d,
      createdAt: d.createdAt ? new Date(d.createdAt).toLocaleString("ko-KR") : "",
    });
  });
  styleDataRows(ws, 2, data.length + 1);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function exportStatsToExcel(stats: {
  kpi: any;
  byMeetup: any[];
  dailyTrend: any[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // Sheet 1: KPI Summary
  const ws1 = wb.addWorksheet("KPI 요약");
  ws1.columns = [
    { header: "항목", key: "label", width: 20 },
    { header: "값", key: "value", width: 15 },
  ];
  styleHeader(ws1);
  const kpiRows = [
    { label: "총 신청", value: stats.kpi.total },
    { label: "대기", value: stats.kpi.pending },
    { label: "승인", value: stats.kpi.approved },
    { label: "거절", value: stats.kpi.rejected },
    { label: "완료", value: stats.kpi.completed },
    { label: "국내", value: stats.kpi.domestic },
    { label: "해외", value: stats.kpi.international },
    { label: "승인율", value: `${stats.kpi.approvalRate}%` },
  ];
  kpiRows.forEach((r) => ws1.addRow(r));
  styleDataRows(ws1, 2, kpiRows.length + 1);

  // Sheet 2: By Meetup
  const ws2 = wb.addWorksheet("밋업별 통계");
  ws2.columns = [
    { header: "밋업", key: "meetupTitle", width: 25 },
    { header: "총 신청", key: "total", width: 10 },
    { header: "대기", key: "pending", width: 10 },
    { header: "승인", key: "approved", width: 10 },
    { header: "거절", key: "rejected", width: 10 },
    { header: "완료", key: "completed", width: 10 },
    { header: "국내", key: "domestic", width: 10 },
    { header: "해외", key: "international", width: 10 },
    { header: "승인율", key: "approvalRate", width: 10 },
  ];
  styleHeader(ws2);
  stats.byMeetup.forEach((m) => ws2.addRow({ ...m, approvalRate: `${m.approvalRate}%` }));
  styleDataRows(ws2, 2, stats.byMeetup.length + 1);

  // Sheet 3: Daily Trend
  const ws3 = wb.addWorksheet("일별 추이");
  ws3.columns = [
    { header: "날짜", key: "date", width: 15 },
    { header: "신청 수", key: "count", width: 12 },
    { header: "누적", key: "cumulative", width: 12 },
  ];
  styleHeader(ws3);
  let cumulative = 0;
  stats.dailyTrend.forEach((d) => {
    cumulative += d.count;
    ws3.addRow({ ...d, cumulative });
  });
  styleDataRows(ws3, 2, stats.dailyTrend.length + 1);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
