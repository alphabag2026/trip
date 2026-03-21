import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface CsvColumn {
  key: string;
  label: string;
  required?: boolean;
}

interface CsvBulkUploadProps {
  title: string;
  description: string;
  columns: CsvColumn[];
  onUpload: (rows: Record<string, any>[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  templateFileName: string;
}

export default function CsvBulkUpload({ title, description, columns, onUpload, templateFileName }: CsvBulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = columns.map(c => c.key);
    const sampleRow = columns.map(c => {
      if (c.key === "hotelName") return "Grand Hotel";
      if (c.key === "hotelAddress") return "123 Main St, City";
      if (c.key === "guestName") return "HONG GILDONG";
      if (c.key === "checkInDate") return "2026-04-01";
      if (c.key === "checkOutDate") return "2026-04-05";
      if (c.key === "roomType") return "Deluxe Double";
      if (c.key === "passengerName") return "HONG GILDONG";
      if (c.key === "outboundAirline") return "Korean Air";
      if (c.key === "outboundFlightNo") return "KE659";
      if (c.key === "outboundDepartureCode") return "ICN";
      if (c.key === "outboundArrivalCode") return "SGN";
      if (c.key === "outboundDepartureDate") return "2026-04-01";
      if (c.key === "outboundDepartureTime") return "09:30";
      if (c.key === "returnAirline") return "Korean Air";
      if (c.key === "returnFlightNo") return "KE660";
      if (c.key === "returnDepartureCode") return "SGN";
      if (c.key === "returnArrivalCode") return "ICN";
      if (c.key === "returnDepartureDate") return "2026-04-05";
      if (c.key === "returnDepartureTime") return "22:00";
      if (c.key === "bookingReference") return "ABC123";
      if (c.key === "ticketNumber") return "180-1234567890";
      if (c.key === "bookingId") return "1339932759";
      return "";
    });
    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 템플릿이 다운로드되었습니다");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setParseErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const errors: string[] = [];
        const rows: Record<string, string>[] = [];

        if (!results.data || results.data.length === 0) {
          setParseErrors(["CSV 파일에 데이터가 없습니다"]);
          return;
        }

        // Validate headers
        const fileHeaders = results.meta.fields || [];
        const requiredCols = columns.filter(c => c.required).map(c => c.key);
        const missingCols = requiredCols.filter(r => !fileHeaders.includes(r));
        if (missingCols.length > 0) {
          setParseErrors([`필수 열이 누락되었습니다: ${missingCols.join(", ")}`]);
          return;
        }

        (results.data as Record<string, string>[]).forEach((row, idx) => {
          // Check required fields
          const missingFields = requiredCols.filter(r => !row[r] || row[r].trim() === "");
          if (missingFields.length > 0) {
            errors.push(`행 ${idx + 2}: 필수 필드 누락 (${missingFields.join(", ")})`);
          } else {
            // Clean up the row - only keep known columns
            const cleanRow: Record<string, string> = {};
            columns.forEach(col => {
              if (row[col.key] !== undefined && row[col.key] !== "") {
                cleanRow[col.key] = row[col.key].trim();
              }
            });
            rows.push(cleanRow);
          }
        });

        setParsedRows(rows);
        setParseErrors(errors);

        if (rows.length > 0) {
          toast.success(`${rows.length}건의 데이터가 파싱되었습니다${errors.length > 0 ? ` (${errors.length}건 오류)` : ""}`);
        }
      },
      error: (error) => {
        setParseErrors([`CSV 파싱 오류: ${error.message}`]);
      },
    });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);
    try {
      const res = await onUpload(parsedRows);
      setResult(res);
      if (res.successCount > 0) {
        toast.success(`${res.successCount}건 일괄 배정 완료`);
      }
      if (res.errorCount > 0) {
        toast.error(`${res.errorCount}건 오류 발생`);
      }
    } catch (e: any) {
      toast.error(e.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setParseErrors([]);
    setResult(null);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />CSV 일괄 배정
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 설명 */}
            <p className="text-sm text-muted-foreground">{description}</p>

            {/* 1단계: 템플릿 다운로드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline">1</Badge> CSV 템플릿 다운로드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    아래 버튼을 클릭하여 CSV 템플릿을 다운로드하세요. 필수 열: {columns.filter(c => c.required).map(c => c.label).join(", ")}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="w-4 h-4 mr-1" />템플릿 다운로드
                  </Button>
                </div>
                {/* 열 정보 테이블 */}
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left font-medium">열 이름</th>
                        <th className="p-2 text-left font-medium">설명</th>
                        <th className="p-2 text-center font-medium">필수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map(col => (
                        <tr key={col.key} className="border-t">
                          <td className="p-2 font-mono">{col.key}</td>
                          <td className="p-2">{col.label}</td>
                          <td className="p-2 text-center">
                            {col.required ? <Badge variant="destructive" className="text-[10px]">필수</Badge> : <span className="text-muted-foreground">선택</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 2단계: CSV 업로드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline">2</Badge> CSV 파일 업로드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" />CSV 파일 선택
                  </Button>
                  {parsedRows.length > 0 && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {parsedRows.length}건 파싱 완료
                    </span>
                  )}
                </div>

                {/* 파싱 에러 표시 */}
                {parseErrors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm mb-1">
                      <XCircle className="w-4 h-4" /> 파싱 오류
                    </div>
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                      {parseErrors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {parseErrors.length > 10 && <li>... 외 {parseErrors.length - 10}건</li>}
                    </ul>
                  </div>
                )}

                {/* 미리보기 테이블 */}
                {parsedRows.length > 0 && (
                  <div className="mt-3 border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left font-medium">#</th>
                          {columns.slice(0, 6).map(col => (
                            <th key={col.key} className="p-2 text-left font-medium whitespace-nowrap">{col.label}</th>
                          ))}
                          {columns.length > 6 && <th className="p-2 text-left font-medium">...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-muted-foreground">{idx + 1}</td>
                            {columns.slice(0, 6).map(col => (
                              <td key={col.key} className="p-2 max-w-[150px] truncate">{row[col.key] || "-"}</td>
                            ))}
                            {columns.length > 6 && <td className="p-2 text-muted-foreground">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 5 && (
                      <div className="p-2 text-xs text-center text-muted-foreground border-t">
                        ... 외 {parsedRows.length - 5}건 더 있음
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3단계: 일괄 배정 실행 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline">3</Badge> 일괄 배정 실행
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleUpload}
                    disabled={parsedRows.length === 0 || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />처리 중...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />{parsedRows.length}건 일괄 배정
                      </>
                    )}
                  </Button>
                  {parsedRows.length > 0 && !uploading && (
                    <Button variant="ghost" size="sm" onClick={handleReset}>초기화</Button>
                  )}
                </div>

                {/* 결과 표시 */}
                {result && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">성공: {result.successCount}건</span>
                      </div>
                      {result.errorCount > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">실패: {result.errorCount}건</span>
                        </div>
                      )}
                    </div>
                    {result.errors.length > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm mb-1">
                          <AlertTriangle className="w-4 h-4" /> 오류 상세
                        </div>
                        <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                          {result.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                          {result.errors.length > 10 && <li>... 외 {result.errors.length - 10}건</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
