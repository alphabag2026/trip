import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plane, ArrowLeft, ClipboardList, Star, CheckCircle2, Loader2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function SurveyResponse() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = parseInt(params.surveyId || "0");

  const { data: survey, isLoading } = trpc.survey.getById.useQuery({ id: surveyId }, { enabled: surveyId > 0 });

  const [respondentName, setRespondentName] = useState("");
  const [respondentPhone, setRespondentPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);

  const respondMutation = trpc.survey.respond.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("설문에 응답해주셔서 감사합니다!");
    },
    onError: () => {
      toast.error("제출 중 오류가 발생했습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    const questions = (survey.questions as any[]) || [];
    const answerArray = questions.map(q => ({
      questionId: q.id,
      value: answers[q.id] ?? "",
    }));

    respondMutation.mutate({
      surveyId,
      respondentName: respondentName || undefined,
      respondentPhone: respondentPhone || undefined,
      answers: answerArray,
    });
  };

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="container flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Meetup Travel</span>
            </Link>
          </div>
        </header>
        <div className="container py-20 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">설문을 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">유효하지 않은 설문 링크입니다.</p>
          <Link href="/">
            <Button variant="outline">홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (survey.status === "closed") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="container flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Meetup Travel</span>
            </Link>
          </div>
        </header>
        <div className="container py-20 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">설문이 종료되었습니다</h2>
          <p className="text-muted-foreground mb-6">이 설문은 더 이상 응답을 받지 않습니다.</p>
          <Link href="/">
            <Button variant="outline">홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const questions = (survey.questions as any[]) || [];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="container flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Meetup Travel</span>
            </Link>
          </div>
        </header>
        <div className="container py-20 text-center max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">응답이 제출되었습니다</h2>
          <p className="text-muted-foreground mb-6">
            소중한 의견 감사합니다.<br />
            더 나은 밋업을 위해 노력하겠습니다.
          </p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Meetup Travel</span>
          </Link>
        </div>
      </header>

      <div className="container py-6 max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> 홈으로
        </Link>

        <Card className="border-border/50 mb-6">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{survey.title}</CardTitle>
                {survey.description && (
                  <CardDescription className="mt-1">{survey.description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Respondent info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">응답자 정보 (선택)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>이름</Label>
                  <Input
                    value={respondentName}
                    onChange={e => setRespondentName(e.target.value)}
                    placeholder="이름을 입력하세요"
                  />
                </div>
                <div>
                  <Label>전화번호</Label>
                  <Input
                    value={respondentPhone}
                    onChange={e => setRespondentPhone(e.target.value)}
                    placeholder="전화번호를 입력하세요"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          {questions.map((q: any, idx: number) => (
            <Card key={q.id} className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-primary font-bold">Q{idx + 1}.</span>
                  {q.text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q.type === "rating" && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setAnswer(q.id, star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            (answers[q.id] as number) >= star
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                    {answers[q.id] && (
                      <span className="text-sm text-muted-foreground ml-2">
                        {answers[q.id]}점
                      </span>
                    )}
                  </div>
                )}

                {q.type === "text" && (
                  <Textarea
                    value={(answers[q.id] as string) || ""}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="답변을 입력하세요..."
                    rows={3}
                  />
                )}

                {q.type === "choice" && q.options && (
                  <RadioGroup
                    value={(answers[q.id] as string) || ""}
                    onValueChange={v => setAnswer(q.id, v)}
                  >
                    {(q.options as string[]).map((opt: string, oi: number) => (
                      <div key={oi} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`${q.id}-${oi}`} />
                        <Label htmlFor={`${q.id}-${oi}`} className="cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ))}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={respondMutation.isPending}
          >
            {respondMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              "설문 제출하기"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
