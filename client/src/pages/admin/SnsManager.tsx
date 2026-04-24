import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Sparkles, Loader2, Send, Clock, CheckCircle2, XCircle, Image as ImageIcon,
  Twitter, Instagram, Megaphone, Trash2, Edit, Eye, Copy, Hash, Calendar,
  BarChart3, TrendingUp, FileText, Wand2, RefreshCw, Globe, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const PLATFORM_ICONS: Record<string, any> = {
  twitter: Twitter, instagram: Instagram, tiktok: Globe, facebook: Globe,
  linkedin: Globe, telegram: Send, all: Megaphone,
};
const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  tiktok: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  linkedin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  telegram: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  all: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function AdminSnsManager() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("posts");
  const [showCreate, setShowCreate] = useState(false);
  const [showAiGenerate, setShowAiGenerate] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [previewPost, setPreviewPost] = useState<any>(null);
  // SNS 계정 관리
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ platform: "twitter" as any, accountName: "", accountId: "" });
  // 필터
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  // 게시물 폼
  const [postForm, setPostForm] = useState({
    title: "", content: "", platform: "all" as any, contentType: "text" as any,
    hashtags: "", scheduledAt: "", status: "draft" as any,
    aiGenerated: false, aiPrompt: "",
  });

  // AI 생성 폼
  const [aiForm, setAiForm] = useState({
    meetupId: undefined as number | undefined,
    platform: "all" as any, tone: "professional" as any,
    language: "ko", additionalContext: "",
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Queries
  const { data: posts, refetch: refetchPosts } = trpc.snsPost.list.useQuery(
    { status: statusFilter !== "all" ? statusFilter : undefined, platform: platformFilter !== "all" ? platformFilter : undefined }
  );
  const { data: stats } = trpc.snsPost.stats.useQuery();
  const { data: accounts, refetch: refetchAccounts } = trpc.snsAccount.list.useQuery();
  const { data: templates, refetch: refetchTemplates } = trpc.snsTemplate.list.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery();

  // Mutations
  const createPost = trpc.snsPost.create.useMutation({ onSuccess: () => { refetchPosts(); setShowCreate(false); resetPostForm(); toast.success("게시물이 생성되었습니다"); } });
  const updatePost = trpc.snsPost.update.useMutation({ onSuccess: () => { refetchPosts(); setEditPost(null); toast.success("게시물이 수정되었습니다"); } });
  const deletePost = trpc.snsPost.delete.useMutation({ onSuccess: () => { refetchPosts(); toast.success("게시물이 삭제되었습니다"); } });
  const generateContent = trpc.snsPost.generateContent.useMutation();
  const generateImage = trpc.snsPost.generateImage.useMutation();
  const createAccount = trpc.snsAccount.create.useMutation({ onSuccess: () => { refetchAccounts(); setShowAddAccount(false); toast.success("계정이 추가되었습니다"); } });
  const deleteAccount = trpc.snsAccount.delete.useMutation({ onSuccess: () => { refetchAccounts(); toast.success("계정이 삭제되었습니다"); } });

  function resetPostForm() {
    setPostForm({ title: "", content: "", platform: "all", contentType: "text", hashtags: "", scheduledAt: "", status: "draft", aiGenerated: false, aiPrompt: "" });
    setGeneratedImageUrl(null);
  }

  async function handleAiGenerate() {
    const result = await generateContent.mutateAsync(aiForm);
    if (result.success && result.data) {
      setAiResult(result.data);
      setPostForm(prev => ({
        ...prev,
        title: result.data.title || "",
        content: result.data.content || "",
        hashtags: (result.data.hashtags || []).join(", "),
        aiGenerated: true,
        aiPrompt: aiForm.additionalContext || "AI 자동 생성",
      }));
      toast.success("AI 콘텐츠가 생성되었습니다");
    } else {
      toast.error(result.error || "AI 생성 실패");
    }
  }

  async function handleGenerateImage(prompt: string) {
    const result = await generateImage.mutateAsync({ prompt });
    if (result.success && result.url) {
      setGeneratedImageUrl(result.url);
      toast.success("AI 이미지가 생성되었습니다");
    } else {
      toast.error(result.error || "이미지 생성 실패");
    }
  }

  function handleCreatePost() {
    createPost.mutate({
      ...postForm,
      hashtags: postForm.hashtags.split(",").map(h => h.trim()).filter(Boolean),
      imageUrls: generatedImageUrl ? [generatedImageUrl] : [],
      scheduledAt: postForm.scheduledAt || undefined,
    });
  }

  const filteredPosts = useMemo(() => posts || [], [posts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-violet-500" />
            SNS 자동 게시 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI로 밋업 홍보 콘텐츠를 생성하고 SNS에 게시합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowAiGenerate(true); setAiResult(null); }}>
            <Sparkles className="h-4 w-4 mr-1" /> AI 콘텐츠 생성
          </Button>
          <Button onClick={() => { setShowCreate(true); resetPostForm(); }}>
            <Plus className="h-4 w-4 mr-1" /> 새 게시물
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "전체", value: stats.total, icon: FileText, color: "text-slate-600" },
            { label: "초안", value: stats.draft, icon: Edit, color: "text-gray-500" },
            { label: "예약됨", value: stats.scheduled, icon: Clock, color: "text-amber-500" },
            { label: "게시됨", value: stats.published, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "실패", value: stats.failed, icon: XCircle, color: "text-red-500" },
            { label: "AI 생성", value: stats.aiGenerated, icon: Sparkles, color: "text-violet-500" },
          ].map(s => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="posts">게시물</TabsTrigger>
          <TabsTrigger value="accounts">SNS 계정</TabsTrigger>
          <TabsTrigger value="templates">템플릿</TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="상태" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="draft">초안</SelectItem>
                <SelectItem value="scheduled">예약됨</SelectItem>
                <SelectItem value="published">게시됨</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="플랫폼" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 플랫폼</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Post List */}
          {filteredPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">아직 게시물이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">AI로 밋업 홍보 콘텐츠를 자동 생성해보세요</p>
                <Button className="mt-4" variant="outline" onClick={() => { setShowAiGenerate(true); setAiResult(null); }}>
                  <Sparkles className="h-4 w-4 mr-1" /> AI 콘텐츠 생성
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredPosts.map((post: any) => {
                const PlatformIcon = PLATFORM_ICONS[post.platform] || Megaphone;
                return (
                  <Card key={post.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-[10px] ${PLATFORM_COLORS[post.platform] || ""}`}>
                              <PlatformIcon className="h-3 w-3 mr-1" />
                              {post.platform}
                            </Badge>
                            <Badge className={`text-[10px] ${STATUS_STYLES[post.status] || ""}`}>
                              {post.status === "draft" ? "초안" : post.status === "scheduled" ? "예약" : post.status === "published" ? "게시됨" : post.status === "failed" ? "실패" : post.status}
                            </Badge>
                            {post.aiGenerated && (
                              <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-500">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                              </Badge>
                            )}
                          </div>
                          {post.title && <h3 className="font-semibold text-sm mb-1">{post.title}</h3>}
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                          {post.hashtags && (post.hashtags as string[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(post.hashtags as string[]).slice(0, 5).map((tag: string, i: number) => (
                                <span key={i} className="text-[10px] text-blue-500">#{tag}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            {post.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(post.scheduledAt).toLocaleString("ko-KR")}
                              </span>
                            )}
                            <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                        {post.imageUrls && (post.imageUrls as string[]).length > 0 && (
                          <img src={(post.imageUrls as string[])[0]} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-1 mt-3 pt-3 border-t">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewPost(post)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> 미리보기
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditPost(post); }}>
                          <Edit className="h-3.5 w-3.5 mr-1" /> 수정
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(post.content); toast.success("복사됨"); }}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> 복사
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => { if (confirm("삭제하시겠습니까?")) deletePost.mutate({ id: post.id }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">연결된 SNS 계정을 관리합니다</p>
            <Button size="sm" onClick={() => setShowAddAccount(true)}>
              <Plus className="h-4 w-4 mr-1" /> 계정 추가
            </Button>
          </div>
          {(!accounts || accounts.length === 0) ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">연결된 SNS 계정이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">게시물을 자동으로 게시하려면 SNS 계정을 연결하세요</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {accounts.map((acc: any) => {
                const Icon = PLATFORM_ICONS[acc.platform] || Globe;
                return (
                  <Card key={acc.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${PLATFORM_COLORS[acc.platform] || ""}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{acc.accountName}</p>
                          <p className="text-xs text-muted-foreground">{acc.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={acc.isActive ? "default" : "secondary"} className="text-[10px]">
                          {acc.isActive ? "활성" : "비활성"}
                        </Badge>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteAccount.mutate({ id: acc.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <p className="text-sm text-muted-foreground">자주 사용하는 콘텐츠 템플릿을 관리합니다 (준비 중)</p>
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">템플릿 기능이 곧 추가됩니다</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Post Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> 새 게시물 작성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>플랫폼</Label>
                <Select value={postForm.platform} onValueChange={v => setPostForm(p => ({ ...p, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>상태</Label>
                <Select value={postForm.status} onValueChange={v => setPostForm(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">초안</SelectItem>
                    <SelectItem value="scheduled">예약</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>제목</Label>
              <Input value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} placeholder="게시물 제목" />
            </div>
            <div>
              <Label>내용</Label>
              <Textarea value={postForm.content} onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="게시물 내용을 입력하세요" />
            </div>
            <div>
              <Label>해시태그 (쉼표로 구분)</Label>
              <Input value={postForm.hashtags} onChange={e => setPostForm(p => ({ ...p, hashtags: e.target.value }))} placeholder="밋업, 여행, 네트워킹" />
            </div>
            {postForm.status === "scheduled" && (
              <div>
                <Label>예약 시간</Label>
                <Input type="datetime-local" value={postForm.scheduledAt} onChange={e => setPostForm(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
            )}
            {generatedImageUrl && (
              <div>
                <Label>AI 생성 이미지</Label>
                <img src={generatedImageUrl} alt="AI Generated" className="w-full rounded-lg mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={handleCreatePost} disabled={!postForm.content.trim() || createPost.isPending}>
              {createPost.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAiGenerate} onOpenChange={setShowAiGenerate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" /> AI 콘텐츠 생성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>밋업 선택 (선택사항)</Label>
              <Select value={String(aiForm.meetupId || "")} onValueChange={v => setAiForm(p => ({ ...p, meetupId: v ? Number(v) : undefined }))}>
                <SelectTrigger><SelectValue placeholder="밋업 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
                  {meetups?.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>플랫폼</Label>
                <Select value={aiForm.platform} onValueChange={v => setAiForm(p => ({ ...p, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>톤</Label>
                <Select value={aiForm.tone} onValueChange={v => setAiForm(p => ({ ...p, tone: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적</SelectItem>
                    <SelectItem value="casual">캐주얼</SelectItem>
                    <SelectItem value="exciting">흥미진진</SelectItem>
                    <SelectItem value="informative">정보 전달</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>추가 컨텍스트 (선택사항)</Label>
              <Textarea value={aiForm.additionalContext} onChange={e => setAiForm(p => ({ ...p, additionalContext: e.target.value }))} rows={3} placeholder="특별히 강조하고 싶은 내용, 타겟 오디언스 등" />
            </div>
            <Button onClick={handleAiGenerate} disabled={generateContent.isPending} className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
              {generateContent.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> AI 생성 중...</> : <><Wand2 className="h-4 w-4 mr-1" /> 콘텐츠 생성</>}
            </Button>

            {/* AI Result Preview */}
            {aiResult && (
              <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">AI 생성 완료</span>
                  </div>
                  {aiResult.title && <h3 className="font-semibold">{aiResult.title}</h3>}
                  <p className="text-sm whitespace-pre-wrap">{aiResult.content}</p>
                  {aiResult.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {aiResult.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs text-blue-500">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {aiResult.imagePrompt && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">이미지 프롬프트: {aiResult.imagePrompt}</p>
                      <Button size="sm" variant="outline" onClick={() => handleGenerateImage(aiResult.imagePrompt)} disabled={generateImage.isPending}>
                        {generateImage.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5 mr-1" />}
                        AI 이미지 생성
                      </Button>
                      {generatedImageUrl && (
                        <img src={generatedImageUrl} alt="AI Generated" className="w-full rounded-lg" />
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => { setShowAiGenerate(false); setShowCreate(true); }}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> 게시물로 저장
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAiGenerate} disabled={generateContent.isPending}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> 다시 생성
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>게시물 미리보기</DialogTitle>
          </DialogHeader>
          {previewPost && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={PLATFORM_COLORS[previewPost.platform] || ""}>{previewPost.platform}</Badge>
                <Badge className={STATUS_STYLES[previewPost.status] || ""}>{previewPost.status}</Badge>
              </div>
              {previewPost.title && <h3 className="font-bold text-lg">{previewPost.title}</h3>}
              <p className="text-sm whitespace-pre-wrap">{previewPost.content}</p>
              {previewPost.imageUrls && (previewPost.imageUrls as string[]).length > 0 && (
                <img src={(previewPost.imageUrls as string[])[0]} alt="" className="w-full rounded-lg" />
              )}
              {previewPost.hashtags && (previewPost.hashtags as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(previewPost.hashtags as string[]).map((tag: string, i: number) => (
                    <span key={i} className="text-xs text-blue-500 font-medium">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPost} onOpenChange={() => setEditPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>게시물 수정</DialogTitle>
          </DialogHeader>
          {editPost && (
            <div className="space-y-4">
              <div>
                <Label>제목</Label>
                <Input value={editPost.title || ""} onChange={e => setEditPost((p: any) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <Label>내용</Label>
                <Textarea value={editPost.content} onChange={e => setEditPost((p: any) => ({ ...p, content: e.target.value }))} rows={5} />
              </div>
              <div>
                <Label>상태</Label>
                <Select value={editPost.status} onValueChange={v => setEditPost((p: any) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">초안</SelectItem>
                    <SelectItem value="scheduled">예약</SelectItem>
                    <SelectItem value="published">게시됨</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPost(null)}>취소</Button>
                <Button onClick={() => updatePost.mutate({ id: editPost.id, content: editPost.content, title: editPost.title, status: editPost.status })} disabled={updatePost.isPending}>
                  {updatePost.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  저장
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>SNS 계정 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>플랫폼</Label>
              <Select value={accountForm.platform} onValueChange={v => setAccountForm(p => ({ ...p, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>계정 이름</Label>
              <Input value={accountForm.accountName} onChange={e => setAccountForm(p => ({ ...p, accountName: e.target.value }))} placeholder="@username" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAccount(false)}>취소</Button>
              <Button onClick={() => createAccount.mutate(accountForm)} disabled={!accountForm.accountName.trim() || createAccount.isPending}>추가</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
