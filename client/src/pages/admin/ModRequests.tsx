import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, CheckCircle, XCircle, Clock } from "lucide-react";

const typeLabels: Record<string, string> = { flight_change: "항공편 변경", hotel_change: "숙소 변경", schedule_change: "일정 변경", other: "기타" };
const statusLabels: Record<string, string> = { pending: "처리중", approved: "승인", rejected: "반려", completed: "완료" };

export default function AdminModRequests() {
  const { data: requests = [], refetch } = trpc.modRequest.list.useQuery();
  const updateMut = trpc.modRequest.process.useMutation({ onSuccess: () => { refetch(); toast.success("처리 완료"); } });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const handleAction = (id: number, status: "approved" | "rejected") => {
    updateMut.mutate({ id, status, adminNotes });
    setSelectedId(null);
    setAdminNotes("");
  };

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Edit className="h-6 w-6 text-primary" /> 수정 요청 관리
          {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}건 대기</Badge>}
        </h1>
      </div>

      {requests.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">수정 요청이 없습니다.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} className={req.status === "pending" ? "border-yellow-500/30" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{typeLabels[req.requestType] || req.requestType}</Badge>
                      <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                        {statusLabels[req.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">신청 ID: {req.registrationId}</span>
                    </div>
                    <p className="text-sm text-foreground mt-2">{req.description}</p>
                    {req.requestedValue && <p className="text-xs text-muted-foreground mt-1">희망: {req.requestedValue}</p>}
                    {req.adminNotes && <p className="text-xs text-primary mt-1">관리자 메모: {req.adminNotes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(req.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <Dialog open={selectedId === req.id} onOpenChange={open => { if (open) setSelectedId(req.id); else { setSelectedId(null); setAdminNotes(""); } }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Clock className="h-3.5 w-3.5 mr-1" /> 처리</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>수정 요청 처리</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                              <p className="font-medium">{typeLabels[req.requestType]}</p>
                              <p className="text-muted-foreground mt-1">{req.description}</p>
                              {req.requestedValue && <p className="text-muted-foreground mt-1">희망: {req.requestedValue}</p>}
                            </div>
                            <div>
                              <Label>관리자 메모</Label>
                              <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="처리 결과 메모" rows={3} className="mt-1" />
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => handleAction(req.id, "approved")} disabled={updateMut.isPending}>
                                <CheckCircle className="h-4 w-4 mr-2" /> 승인
                              </Button>
                              <Button variant="destructive" className="flex-1" onClick={() => handleAction(req.id, "rejected")} disabled={updateMut.isPending}>
                                <XCircle className="h-4 w-4 mr-2" /> 반려
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
