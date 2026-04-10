import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/**
 * Helper: decode base64 string to Blob and trigger download
 */
function downloadBase64(base64: string, filename: string) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ExcelDownloadButtonProps = {
  label?: string;
  icon?: "template" | "export";
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  fetchData: () => Promise<{ base64: string; filename: string }>;
  className?: string;
};

export function ExcelDownloadButton({
  label,
  icon = "export",
  variant = "outline",
  size = "sm",
  fetchData,
  className,
}: ExcelDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await fetchData();
      downloadBase64(result.base64, result.filename);
      toast.success(t("admin.excel.downloadSuccess", "다운로드 완료"));
    } catch (err: any) {
      console.error("Excel download error:", err);
      toast.error(t("admin.excel.downloadError", "다운로드 실패"));
    } finally {
      setLoading(false);
    }
  };

  const Icon = icon === "template" ? FileSpreadsheet : Download;
  const defaultLabel =
    icon === "template"
      ? t("admin.excel.downloadTemplate", "서식 다운로드")
      : t("admin.excel.exportExcel", "엑셀 내보내기");

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      <Icon className="h-4 w-4 mr-1.5" />
      {loading ? t("admin.excel.downloading", "다운로드 중...") : label || defaultLabel}
    </Button>
  );
}

/**
 * A toolbar with both template download and data export buttons
 */
export function ExcelToolbar({
  templateFetch,
  exportFetch,
  templateLabel,
  exportLabel,
  className,
}: {
  templateFetch?: () => Promise<{ base64: string; filename: string }>;
  exportFetch?: () => Promise<{ base64: string; filename: string }>;
  templateLabel?: string;
  exportLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {templateFetch && (
        <ExcelDownloadButton
          icon="template"
          variant="outline"
          fetchData={templateFetch}
          label={templateLabel}
        />
      )}
      {exportFetch && (
        <ExcelDownloadButton
          icon="export"
          variant="outline"
          fetchData={exportFetch}
          label={exportLabel}
        />
      )}
    </div>
  );
}

/**
 * Helper to call tRPC query endpoints via raw fetch (for imperative calls outside hooks)
 */
export async function fetchTrpcQuery(
  procedure: string,
  input?: any
): Promise<{ base64: string; filename: string }> {
  const url = new URL("/api/trpc/" + procedure, window.location.origin);
  if (input !== undefined) {
    // tRPC expects input as JSON-encoded query param
    url.searchParams.set("input", JSON.stringify({ json: input }));
  }
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  // tRPC wraps result in { result: { data: { json: ... } } }
  const data = body?.result?.data?.json || body?.result?.data || body;
  return data;
}
