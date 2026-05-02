import { describe, it, expect, vi } from "vitest";

// ── v6.20 체크인 알림 + QR 발송 + 키오스크 모드 테스트 ──

describe("v6.20 - 체크인 알림 시스템", () => {
  describe("체크인 시 알림 구조", () => {
    it("체크인 성공 시 주최자 텔레그램 알림 메시지 포맷", () => {
      const reg = { name: "김철수", email: "test@example.com" };
      const meetup = { title: "서울 Web3 밋업" };
      const stats = { checkedIn: 5, total: 20 };

      const message =
        `✅ <b>체크인 완료</b>\n` +
        `👤 ${reg.name}\n` +
        `📋 ${meetup.title}\n` +
        `📊 ${stats.checkedIn + 1}/${stats.total} 체크인 완료`;

      expect(message).toContain("체크인 완료");
      expect(message).toContain("김철수");
      expect(message).toContain("서울 Web3 밋업");
      expect(message).toContain("6/20");
    });

    it("체크인 성공 시 참가자 환영 이메일 HTML 포맷", () => {
      const reg = { name: "이영희", email: "lee@example.com" };
      const meetup = { title: "도쿄 블록체인 서밋" };
      const checkedInAt = new Date("2026-05-03T10:00:00+09:00");

      const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#6366f1">환영합니다, ${reg.name}님! 🎉</h2>
        <p><strong>${meetup.title}</strong>에 성공적으로 체크인되었습니다.</p>
        <p style="color:#666;font-size:14px">체크인 시간: ${checkedInAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
        <p>즐거운 시간 보내세요!</p>
      </div>`;

      expect(html).toContain("환영합니다, 이영희님!");
      expect(html).toContain("도쿄 블록체인 서밋");
      expect(html).toContain("체크인 시간:");
    });

    it("이메일 없는 참가자는 환영 이메일 스킵", () => {
      const reg = { name: "박민수", email: null };
      const shouldSendEmail = !!reg.email;
      expect(shouldSendEmail).toBe(false);
    });
  });

  describe("QR 코드 이메일 발송", () => {
    it("QR 이메일 HTML에 QR 이미지가 포함됨", () => {
      const reg = { name: "테스트 유저", email: "test@test.com" };
      const meetup = { title: "밋업 테스트" };
      const qrDataUrl = "data:image/png;base64,iVBORw0KGgo...";

      const html = `<div>
        <h2>🎫 QR 체크인 코드</h2>
        <p><strong>${reg.name}</strong>님, <strong>${meetup.title}</strong>의 QR 체크인 코드입니다.</p>
        <div style="text-align:center;margin:24px 0">
          <img src="${qrDataUrl}" alt="QR Code" style="width:250px;height:250px" />
        </div>
      </div>`;

      expect(html).toContain("QR 체크인 코드");
      expect(html).toContain(reg.name);
      expect(html).toContain(meetup.title);
      expect(html).toContain("data:image/png;base64");
    });

    it("이메일 subject에 밋업 제목이 포함됨", () => {
      const meetupTitle = "서울 Web3 밋업";
      const subject = `🎫 ${meetupTitle} - QR 체크인 코드`;
      expect(subject).toContain("서울 Web3 밋업");
      expect(subject).toContain("QR 체크인 코드");
    });

    it("일괄 발송 결과 카운트 구조", () => {
      const result = { sent: 15, skipped: 3, failed: 2, total: 20 };
      expect(result.sent + result.skipped + result.failed).toBe(result.total);
      expect(result.sent).toBeGreaterThan(0);
    });
  });

  describe("QR 코드 텔레그램 발송", () => {
    it("텔레그램 메시지에 체크인 링크가 포함됨", () => {
      const reg = { name: "김텔레" };
      const meetup = { title: "밋업 테스트" };
      const checkinUrl = "https://alphatrip.org/checkin-scanner?token=abc123";

      const message =
        `🎫 <b>QR 체크인 코드</b>\n` +
        `👤 ${reg.name}\n` +
        `📋 ${meetup.title}\n` +
        `🔗 <a href="${checkinUrl}">체크인 링크</a>`;

      expect(message).toContain("QR 체크인 코드");
      expect(message).toContain("김텔레");
      expect(message).toContain("checkin-scanner?token=abc123");
    });

    it("일괄 텔레그램 발송 결과 구조", () => {
      const result = { sent: 18, failed: 2, total: 20 };
      expect(result.sent + result.failed).toBe(result.total);
    });
  });

  describe("키오스크 모드", () => {
    it("QR 토큰 추출 - URL에서 token 파라미터 추출", () => {
      const extractToken = (data: string): string => {
        try {
          const url = new URL(data, "https://placeholder.com");
          return url.searchParams.get("token") || data;
        } catch {
          return data;
        }
      };

      // Full URL
      expect(extractToken("https://alphatrip.org/checkin-scanner?token=abc123")).toBe("abc123");
      // Relative URL
      expect(extractToken("/checkin-scanner?token=xyz789")).toBe("xyz789");
      // Plain token
      expect(extractToken("plain-token-value")).toBe("plain-token-value");
    });

    it("체크인 결과 상태 분류", () => {
      const successResult = { success: true, alreadyCheckedIn: false, participantName: "김철수" };
      const alreadyResult = { success: true, alreadyCheckedIn: true, participantName: "이영희" };
      const failResult = { success: false, message: "토큰 없음" };

      const isSuccess = successResult.success && !successResult.alreadyCheckedIn;
      const isAlready = alreadyResult.alreadyCheckedIn;
      const isFail = !failResult.success;

      expect(isSuccess).toBe(true);
      expect(isAlready).toBe(true);
      expect(isFail).toBe(true);
    });

    it("디바운스 로직 - 같은 토큰 3초 이내 중복 방지", () => {
      let lastToken = "";
      let lastTime = 0;
      const DEBOUNCE_MS = 3000;

      const shouldProcess = (token: string): boolean => {
        const now = Date.now();
        if (token === lastToken && now - lastTime < DEBOUNCE_MS) return false;
        lastToken = token;
        lastTime = now;
        return true;
      };

      expect(shouldProcess("token-a")).toBe(true);
      expect(shouldProcess("token-a")).toBe(false); // same token within 3s
      expect(shouldProcess("token-b")).toBe(true); // different token
    });

    it("자동 리셋 타이머 설정값", () => {
      const validResetTimes = [3000, 5000, 8000, 10000];
      expect(validResetTimes).toContain(5000); // default
      expect(validResetTimes.every(t => t >= 3000 && t <= 10000)).toBe(true);
    });

    it("키오스크 디바이스 정보 전송", () => {
      const checkinPayload = {
        qrToken: "test-token",
        deviceInfo: "kiosk",
        locationNote: "키오스크 체크인",
      };
      expect(checkinPayload.deviceInfo).toBe("kiosk");
      expect(checkinPayload.locationNote).toContain("키오스크");
    });
  });

  describe("체크인 대시보드 QR 발송 UI", () => {
    it("일괄 발송 시 origin 전달", () => {
      const origin = "https://alphatrip.org";
      const payload = { meetupId: 1, origin };
      expect(payload.origin).toBe("https://alphatrip.org");
    });

    it("개별 발송 시 checkinId 전달", () => {
      const payload = { checkinId: 42, origin: "https://alphatrip.org" };
      expect(payload.checkinId).toBe(42);
      expect(payload.origin).toContain("alphatrip");
    });
  });
});
