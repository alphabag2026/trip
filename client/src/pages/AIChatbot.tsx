import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plane, ArrowLeft, Bot, Send, User, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { nanoid } from "nanoid";
import LanguageSelector from "@/components/LanguageSelector";

export default function AIChatbot() {
  const { t } = useTranslation();
  const [sessionId] = useState(() => nanoid());
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; content: string; time: Date }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setMessages(prev => [...prev, { role: "bot", content: t("chatbot.error"), time: new Date() }]);
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
    askMutation.mutate({ sessionId, message: trimmed, meetupId: selectedMeetupId });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    t("chatbot.q1"),
    t("chatbot.q2"),
    t("chatbot.q3"),
    t("chatbot.q4"),
    t("chatbot.q5"),
    t("chatbot.q6"),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-7 w-7 rounded-md" />
            <span className="font-bold text-lg">Alpha Trip</span>
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.register")}</Link>
              <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.lookup")}</Link>
              <Link href="/flight-pickup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.flightPickup")}</Link>
              <Link href="/chatbot" className="text-foreground font-medium">{t("nav.chatbot")}</Link>
            </nav>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="container py-6 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("chatbot.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("chatbot.desc")}</p>
          </div>
        </div>

        {activeMeetups.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">{t("chatbot.selectMeetup")}</p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={!selectedMeetupId ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedMeetupId(undefined)}
              >
                {t("chatbot.all")}
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

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div ref={scrollRef} className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{t("chatbot.welcome")}</h3>
                    <p className="text-sm text-muted-foreground max-w-md">{t("chatbot.welcomeDesc")}</p>
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

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "bot" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {askMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("chatbot.generating")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border/50 p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("chatbot.placeholder")}
                  disabled={askMutation.isPending}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!message.trim() || askMutation.isPending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">{t("chatbot.disclaimer")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
