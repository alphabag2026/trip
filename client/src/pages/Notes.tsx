import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StickyNote, Plus, Pin, PinOff, Trash2, Edit3, Search,
  ArrowLeft, MoreVertical, Share2, Tag, Palette, X, Check
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { getLoginUrl } from "@/const";

const NOTE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  yellow: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-900 dark:text-amber-100", dot: "bg-amber-400" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-900 dark:text-blue-100", dot: "bg-blue-400" },
  green: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-900 dark:text-emerald-100", dot: "bg-emerald-400" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800", text: "text-pink-900 dark:text-pink-100", dot: "bg-pink-400" },
  purple: { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-900 dark:text-violet-100", dot: "bg-violet-400" },
};

const COLOR_OPTIONS = ["yellow", "blue", "green", "pink", "purple"] as const;

export default function Notes() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formColor, setFormColor] = useState<typeof COLOR_OPTIONS[number]>("yellow");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: notesList, isLoading } = trpc.note.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createNote = trpc.note.create.useMutation({
    onSuccess: () => { utils.note.list.invalidate(); closeForm(); },
  });
  const updateNote = trpc.note.update.useMutation({
    onSuccess: () => { utils.note.list.invalidate(); closeForm(); },
  });
  const deleteNote = trpc.note.delete.useMutation({
    onSuccess: () => { utils.note.list.invalidate(); setIsDeleteConfirmOpen(false); setDeleteTargetId(null); },
  });
  const togglePin = trpc.note.togglePin.useMutation({
    onSuccess: () => { utils.note.list.invalidate(); },
  });

  const closeForm = useCallback(() => {
    setIsCreateOpen(false);
    setEditingNote(null);
    setFormTitle("");
    setFormContent("");
    setFormColor("yellow");
    setFormTags([]);
    setTagInput("");
  }, []);

  const openEdit = useCallback((note: any) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content || "");
    setFormColor(note.color || "yellow");
    setFormTags(note.tags || []);
    setIsCreateOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formTitle.trim()) return;
    if (editingNote) {
      updateNote.mutate({
        id: editingNote.id,
        title: formTitle.trim(),
        content: formContent,
        color: formColor,
        tags: formTags.length > 0 ? formTags : undefined,
      });
    } else {
      createNote.mutate({
        title: formTitle.trim(),
        content: formContent || undefined,
        color: formColor,
        tags: formTags.length > 0 ? formTags : undefined,
      });
    }
  }, [formTitle, formContent, formColor, formTags, editingNote, createNote, updateNote]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !formTags.includes(tag)) {
      setFormTags(prev => [...prev, tag]);
    }
    setTagInput("");
  }, [tagInput, formTags]);

  const removeTag = useCallback((tag: string) => {
    setFormTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Filter notes by search
  const filteredNotes = (notesList || []).filter((note: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      (note.content && note.content.toLowerCase().includes(q)) ||
      (note.tags && note.tags.some((t: string) => t.toLowerCase().includes(q)))
    );
  });

  const pinnedNotes = filteredNotes.filter((n: any) => n.isPinned);
  const otherNotes = filteredNotes.filter((n: any) => !n.isPinned);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <StickyNote className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-bold mb-2">{t("notes.loginRequired", "로그인이 필요합니다")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("notes.loginDesc", "메모 기능을 사용하려면 로그인해주세요.")}</p>
            <a href={getLoginUrl()}>
              <Button className="w-full">{t("home.loginBtn", "로그인")}</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/95">
        <div className="container flex items-center h-14 gap-3 max-w-lg mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{t("notes.title", "메모")}</h1>
          </div>
          <Button
            onClick={() => { closeForm(); setIsCreateOpen(true); }}
            size="sm"
            className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="h-4 w-4" />
            {t("notes.newNote", "새 메모")}
          </Button>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 pb-24">
        {/* Search */}
        <div className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("notes.searchPlaceholder", "메모 검색...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchQuery
                ? t("notes.noResults", "검색 결과가 없습니다")
                : t("notes.empty", "메모가 없습니다")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? t("notes.tryDifferent", "다른 키워드로 검색해보세요")
                : t("notes.emptyDesc", "출장 중 메모를 작성해보세요")}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => { closeForm(); setIsCreateOpen(true); }}
                className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Plus className="h-4 w-4" />
                {t("notes.firstNote", "첫 메모 작성하기")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {/* Pinned */}
            {pinnedNotes.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 py-1">
                  <Pin className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">
                    {t("notes.pinned", "고정됨")}
                  </span>
                </div>
                {pinnedNotes.map((note: any) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={openEdit}
                    onDelete={(id) => { setDeleteTargetId(id); setIsDeleteConfirmOpen(true); }}
                    onTogglePin={(id) => togglePin.mutate({ id })}
                    t={t}
                  />
                ))}
              </>
            )}

            {/* Others */}
            {otherNotes.length > 0 && pinnedNotes.length > 0 && (
              <div className="flex items-center gap-1.5 py-1 mt-3">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("notes.others", "메모")}
                </span>
              </div>
            )}
            {otherNotes.map((note: any) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={openEdit}
                onDelete={(id) => { setDeleteTargetId(id); setIsDeleteConfirmOpen(true); }}
                onTogglePin={(id) => togglePin.mutate({ id })}
                t={t}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? t("notes.editNote", "메모 수정") : t("notes.newNote", "새 메모")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className={`w-7 h-7 rounded-full ${NOTE_COLORS[color].dot} transition-all ${
                      formColor === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Title */}
            <Input
              placeholder={t("notes.titlePlaceholder", "제목을 입력하세요")}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="text-lg font-medium"
              autoFocus
            />

            {/* Content */}
            <textarea
              placeholder={t("notes.contentPlaceholder", "내용을 입력하세요...")}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("notes.tags", "태그")}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("notes.addTag", "태그 추가")}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={addTag} className="h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t("notes.cancel", "취소")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formTitle.trim() || createNote.isPending || updateNote.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              {editingNote ? t("notes.save", "저장") : t("notes.create", "작성")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("notes.deleteConfirm", "메모를 삭제하시겠습니까?")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("notes.deleteDesc", "삭제된 메모는 복구할 수 없습니다.")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              {t("notes.cancel", "취소")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTargetId && deleteNote.mutate({ id: deleteTargetId })}
              disabled={deleteNote.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("notes.delete", "삭제")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ note, onEdit, onDelete, onTogglePin, t }: {
  note: any;
  onEdit: (note: any) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number) => void;
  t: any;
}) {
  const colors = NOTE_COLORS[note.color || "yellow"] || NOTE_COLORS.yellow;
  const dateStr = new Date(note.updatedAt).toLocaleDateString("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card
      className={`${colors.bg} ${colors.border} border cursor-pointer hover:shadow-md transition-shadow group`}
      onClick={() => onEdit(note)}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {note.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
              <h3 className={`font-semibold text-sm truncate ${colors.text}`}>{note.title}</h3>
            </div>
            {note.content && (
              <p className={`text-xs ${colors.text} opacity-70 line-clamp-2 mb-2`}>{note.content}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{dateStr}</span>
              {note.tags && note.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4">{tag}</Badge>
              ))}
              {note.isShared && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                  <Share2 className="h-2.5 w-2.5" />{t("notes.shared", "공유")}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(note)}>
                <Edit3 className="h-4 w-4 mr-2" />{t("notes.edit", "수정")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
                {note.isPinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                {note.isPinned ? t("notes.unpin", "고정 해제") : t("notes.pin", "고정")}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(note.id)}>
                <Trash2 className="h-4 w-4 mr-2" />{t("notes.delete", "삭제")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
