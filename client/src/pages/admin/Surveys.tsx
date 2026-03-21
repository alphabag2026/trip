import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Plus, Send, Trash2, Eye, BarChart3, Star, MessageCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";

type Question = {
  id: string;
  text: string;
  type: "rating" | "text" | "choice";
  options?: string[];
};

export default function AdminSurveys() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: surveys, isLoading } = trpc.survey.list.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMeetupId, setSelectedMeetupId] = useState<string>("none");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQText, setNewQText] = useState("");
  const [newQType, setNewQType] = useState<"rating" | "text" | "choice">("rating");
  const [newQOptions, setNewQOptions] = useState("");

  // View responses
  const [viewSurveyId, setViewSurveyId] = useState<number | null>(null);
  const { data: responses } = trpc.survey.responses.useQuery(
    { surveyId: viewSurveyId! },
    { enabled: viewSurveyId !== null }
  );

  const createMutation = trpc.survey.create.useMutation({
    onSuccess: () => {
      toast.success("설문조사가 생성되었습니다.");
      utils.survey.list.invalidate();
      resetForm();
      setShowCreate(false);
    },
    onError: () => toast.error("생성 중 오류가 발생했습니다."),
  });

  const updateMutation = trpc.survey.update.useMutation({
    onSuccess: () => {
      toast.success("설문 상태가 변경되었습니다.");
      utils.survey.list.invalidate();
    },
  });

  const deleteMutation = trpc.survey.delete.useMutation({
    onSuccess: () => {
      toast.success("설문이 삭제되었습니다.");
      utils.survey.list.invalidate();
    },
  });

  const sendTelegramMutation = trpc.survey.sendViaTelegram.useMutation({
    onSuccess: (data) => {
      toast.success(`설문이 텔레그램으로 발송되었습니다. (대상: ${data.recipientCount}명)`);
      utils.survey.list.invalidate();
    },
    onError: () => toast.error("발송 중 오류가 발생했습니다."),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedMeetupId("none");
    setQuestions([]);
    setNewQText("");
    setNewQType("rating");
    setNewQOptions("");
  };

  const addQuestion = () => {
    if (!newQText.trim()) return;
    const q: Question = {
      id: nanoid(8),
      text: newQText.trim(),
      type: newQType,
    };
    if (newQType === "choice" && newQOptions.trim()) {
      q.options = newQOptions.split(",").map(o => o.trim()).filter(Boolean);
    }
    setQuestions(prev => [...prev, q]);
    setNewQText("");
    setNewQOptions("");
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleCreate = () => {
    if (!title.trim() || questions.length === 0) {
      toast.error("제목과 최소 1개의 질문이 필요합니다.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      meetupId: selectedMeetupId !== "none" ? parseInt(selectedMeetupId) : undefined,
      questions,
    });
  };

  const surveyUrl = (id: number) => `${window.location.origin}/survey/${id}`;

  const copySurveyLink = (id: number) => {
    navigator.clipboard.writeText(surveyUrl(id));
    toast.success("설문 링크가 복사되었습니다.");
  };

  // Calculate stats for a survey
  const calcStats = (surveyQuestions: any[], resps: any[]) => {
    if (!resps || resps.length === 0) return null;
    const stats: Record<string, any> = {};
    for (const q of surveyQuestions) {
      const qAnswers = resps.map(r => {
        const a = (r.answers as any[])?.find((a: any) => a.questionId === q.id);
        return a?.value;
      }).filter(v => v !== undefined && v !== "");

      if (q.type === "rating") {
        const nums = qAnswers.map(Number).filter(n => !isNaN(n));
        stats[q.id] = {
          avg: nums.length > 0 ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : 0,
          count: nums.length,
          distribution: [1, 2, 3, 4, 5].map(s => nums.filter(n => n === s).length),
        };
      } else if (q.type === "choice") {
        const counts: Record<string, number> = {};
        qAnswers.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        stats[q.id] = { counts, total: qAnswers.length };
      } else {
        stats[q.id] = { answers: qAnswers };
      }
    }
    return stats;
  };

  const viewSurvey = useMemo(() => {
    if (!viewSurveyId || !surveys) return null;
    return surveys.find(s => s.id === viewSurveyId) || null;
  }, [viewSurveyId, surveys]);

  const viewStats = useMemo(() => {
    if (!viewSurvey || !responses) return null;
    return calcStats((viewSurvey.questions as any[]) || [], responses);
  }, [viewSurvey, responses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            설문조사 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">참석자 만족도 설문을 생성하고 관리합니다</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> 설문 생성</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 설문조사 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>제목 *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="설문 제목" />
              </div>
              <div>
                <Label>설명</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="설문 설명 (선택)" rows={2} />
              </div>
              <div>
                <Label>밋업 연결</Label>
                <Select value={selectedMeetupId} onValueChange={setSelectedMeetupId}>
                  <SelectTrigger><SelectValue placeholder="밋업 선택 (선택)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">전체 (밋업 무관)</SelectItem>
                    {meetups?.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Questions list */}
              <div>
                <Label className="mb-2 block">질문 목록 ({questions.length}개)</Label>
                {questions.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    아래에서 질문을 추가하세요
                  </p>
                )}
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <span className="text-xs font-bold text-primary mt-1">Q{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{q.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {q.type === "rating" ? "별점" : q.type === "text" ? "서술형" : t("admin.surveys.multipleChoice")}
                          </Badge>
                          {q.options && (
                            <span className="text-[10px] text-muted-foreground">
                              옵션: {q.options.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeQuestion(q.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add question */}
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <Label className="text-sm font-medium">{t("admin.surveys.addQuestion")}</Label>
                  <Input value={newQText} onChange={e => setNewQText(e.target.value)} placeholder="질문 내용" />
                  <div className="flex gap-2">
                    <Select value={newQType} onValueChange={v => setNewQType(v as any)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">별점 (1-5)</SelectItem>
                        <SelectItem value="text">서술형</SelectItem>
                        <SelectItem value="choice">{t("admin.surveys.multipleChoice")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {newQType === "choice" && (
                      <Input
                        value={newQOptions}
                        onChange={e => setNewQOptions(e.target.value)}
                        placeholder="옵션 (쉼표 구분)"
                        className="flex-1"
                      />
                    )}
                    <Button variant="outline" onClick={addQuestion} disabled={!newQText.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Survey list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !surveys || surveys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">아직 생성된 설문이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {surveys.map(s => {
            const qs = (s.questions as any[]) || [];
            return (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{s.title}</h3>
                        <Badge variant={s.status === "active" ? "default" : s.status === "closed" ? "secondary" : "outline"}>
                          {s.status === "draft" ? "초안" : s.status === "active" ? "진행중" : "종료"}
                        </Badge>
                        {s.sentViaTelegram && <Badge variant="outline" className="text-[10px]">텔레그램 발송됨</Badge>}
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground mb-2">{s.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>질문 {qs.length}개</span>
                        <span>생성: {new Date(s.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => copySurveyLink(s.id)}>
                        <Copy className="h-3 w-3 mr-1" /> 링크 복사
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewSurveyId(s.id)}
                      >
                        <BarChart3 className="h-3 w-3 mr-1" /> 결과
                      </Button>
                      {s.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendTelegramMutation.mutate({ surveyId: s.id, meetupId: s.meetupId ?? undefined })}
                          disabled={sendTelegramMutation.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" /> 텔레그램
                        </Button>
                      )}
                      <Select
                        value={s.status}
                        onValueChange={v => updateMutation.mutate({ id: s.id, status: v as any })}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">초안</SelectItem>
                          <SelectItem value="active">진행중</SelectItem>
                          <SelectItem value="closed">종료</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (confirm("이 설문을 삭제하시겠습니까?")) {
                            deleteMutation.mutate({ id: s.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View responses dialog */}
      <Dialog open={viewSurveyId !== null} onOpenChange={(open) => { if (!open) setViewSurveyId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              설문 결과: {viewSurvey?.title}
            </DialogTitle>
          </DialogHeader>

          {responses && responses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>아직 응답이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                총 <strong className="text-foreground">{responses?.length || 0}</strong>건의 응답
              </div>

              {viewSurvey && ((viewSurvey.questions as any[]) || []).map((q: any, idx: number) => (
                <Card key={q.id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-primary font-bold">Q{idx + 1}.</span>
                      {q.text}
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {q.type === "rating" ? "별점" : q.type === "text" ? "서술형" : t("admin.surveys.multipleChoice")}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {q.type === "rating" && viewStats?.[q.id] && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`h-5 w-5 ${
                                s <= Math.round(Number(viewStats[q.id].avg))
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground/20"
                              }`} />
                            ))}
                          </div>
                          <span className="text-2xl font-bold">{viewStats[q.id].avg}</span>
                          <span className="text-sm text-muted-foreground">/ 5.0 ({viewStats[q.id].count}명)</span>
                        </div>
                        <div className="space-y-1">
                          {[5, 4, 3, 2, 1].map(s => {
                            const count = viewStats[q.id].distribution[s - 1];
                            const pct = viewStats[q.id].count > 0 ? (count / viewStats[q.id].count) * 100 : 0;
                            return (
                              <div key={s} className="flex items-center gap-2 text-xs">
                                <span className="w-8 text-right">{s}점</span>
                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-8 text-muted-foreground">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {q.type === "choice" && viewStats?.[q.id] && (
                      <div className="space-y-2">
                        {Object.entries(viewStats[q.id].counts as Record<string, number>).map(([opt, cnt]) => {
                          const pct = viewStats[q.id].total > 0 ? (cnt / viewStats[q.id].total) * 100 : 0;
                          return (
                            <div key={opt} className="flex items-center gap-2 text-sm">
                              <span className="w-24 truncate">{opt}</span>
                              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-16 text-xs text-muted-foreground text-right">{cnt}명 ({pct.toFixed(0)}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "text" && viewStats?.[q.id] && (
                      <ScrollArea className="max-h-40">
                        <div className="space-y-2">
                          {(viewStats[q.id].answers as string[]).map((a, i) => (
                            <div key={i} className="text-sm p-2 rounded bg-muted/50">{a}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
