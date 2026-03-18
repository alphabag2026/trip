import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plane, ArrowLeft, Bot, Send, User, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { nanoid } from "nanoid";

export default function AIChatbot() {
  const [sessionId] = useState(() => nanoid());
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; content: string; time: Date }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get meetup list for context
  const { data: meetups } = trpc.meetup.list.useQuery();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | undefined>();

  const activeMeetups = useMemo(() => {
    return meetups?.filter(m => m.status === "open" || m.status === "draft") || [];
  }, [meetups]);

  const askMutation = trpc.chatbot.ask.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "bot", content: data.response, time: new Date() }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "bot", content: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", time: new Date() }]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || askMutation.isPending) return;

    setMessages(prev => [...prev, { role: "user", content: trimmed, time: new Date() }]);
    setMessage("");

    askMutation.mutate({
      sessionId,
      message: trimmed,
      meetupId: selectedMeetupId,
    });

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "여행 준비물이 뭐가 필요한가요?",
    "비자는 어떻게 신청하나요?",
    "공항 픽업은 어떻게 되나요?",
    "숙소 배치는 어떻게 확인하나요?",
    "현지 날씨는 어떤가요?",
    "일정표를 확인하고 싶어요",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Meetup Travel</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">밋업 신청</Link>
            <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">여정표 조회</Link>
            <Link href="/flight-pickup" className="text-muted-foreground hover:text-foreground transition-colors">항공편/픽업</Link>
            <Link href="/chatbot" className="text-foreground font-medium">AI 도우미</Link>
          </nav>
        </div>
      </header>

      <div className="container py-6 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> 홈으로
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI 출장 도우미</h1>
            <p className="text-sm text-muted-foreground">밋업 & 출장 관련 궁금한 점을 물어보세요</p>
          </div>
        </div>

        {/* Meetup selector */}
        {activeMeetups.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">밋업을 선택하면 더 정확한 답변을 받을 수 있습니다</p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={!selectedMeetupId ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedMeetupId(undefined)}
              >
                전체
              </Badge>
              {activeMeetups.map(m => (
                <Badge
                  key={m.id}
                  variant={selectedMeetupId === m.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedMeetupId(m.id)}
                >
                  {m.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div
              ref={scrollRef}
              className="h-[500px] overflow-y-auto p-4 space-y-4"
            >
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">안녕하세요! AI 출장 도우미입니다</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      여행 준비물, 비자, 일정, 픽업, 숙소 등<br />
                      출장 관련 궁금한 점을 자유롭게 물어보세요.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setMessage(q);
                          setTimeout(() => {
                            setMessages(prev => [...prev, { role: "user", content: q, time: new Date() }]);
                            setMessage("");
                            askMutation.mutate({ sessionId, message: q, meetupId: selectedMeetupId });
                          }, 0);
                        }}
                        className="text-left text-xs p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="h-3 w-3 mb-1 text-primary" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "bot" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-[10px] mt-1 ${
                      msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}>
                      {msg.time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {askMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      답변 생성 중...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-border/50 p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="궁금한 점을 입력하세요..."
                  disabled={askMutation.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || askMutation.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                AI가 생성한 답변은 참고용이며, 정확한 정보는 관리자에게 확인하세요.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
