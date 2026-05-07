import { describe, it, expect } from "vitest";

/**
 * MeetupShareModal 추천글 생성 로직 테스트
 * 프론트엔드 컴포넌트이지만 추천글 생성 로직의 정확성을 검증
 */

interface MeetupData {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  scheduleStart?: string | Date | null;
  scheduleEnd?: string | Date | null;
  maxParticipants?: number | null;
  invitedCountries?: string[] | null;
  projectCode?: string | null;
  shareToken?: string | null;
}

// 추천글 생성 함수들 (컴포넌트에서 추출한 순수 함수)
function generateSummary(meetup: MeetupData, shareUrl: string): string {
  const lines: string[] = [];
  lines.push(`✈️ ${meetup.title}`);
  lines.push("");
  if (meetup.location) lines.push(`📍 장소: ${meetup.location}`);
  if (meetup.scheduleStart) {
    const start = new Date(meetup.scheduleStart).toLocaleDateString();
    const end = meetup.scheduleEnd ? new Date(meetup.scheduleEnd).toLocaleDateString() : null;
    const period = end ? `${start} ~ ${end}` : start;
    lines.push(`📅 기간: ${period}`);
  }
  if (meetup.maxParticipants) lines.push(`👥 최대 인원: ${meetup.maxParticipants}명`);
  if (meetup.invitedCountries && meetup.invitedCountries.length > 0) {
    lines.push(`🌍 초청국가: ${meetup.invitedCountries.join(", ")}`);
  }
  lines.push("");
  lines.push(`👉 지금 신청하기: ${shareUrl}`);
  return lines.join("\n");
}

function generateInvite(meetup: MeetupData, shareUrl: string): string {
  const lines: string[] = [];
  lines.push(`🎉 밋업에 초대합니다!`);
  lines.push("");
  lines.push(`안녕하세요! 아래 밋업에 함께 참석하실 분을 찾고 있습니다.`);
  lines.push("");
  lines.push(`📌 ${meetup.title}`);
  if (meetup.location) lines.push(`📍 ${meetup.location}`);
  if (meetup.scheduleStart) {
    const start = new Date(meetup.scheduleStart).toLocaleDateString();
    const end = meetup.scheduleEnd ? new Date(meetup.scheduleEnd).toLocaleDateString() : null;
    lines.push(`📅 ${end ? `${start} ~ ${end}` : start}`);
  }
  if (meetup.description) {
    const desc = meetup.description.length > 100 ? meetup.description.slice(0, 100) + "..." : meetup.description;
    lines.push("");
    lines.push(`💡 ${desc}`);
  }
  lines.push("");
  lines.push(`관심 있으시면 아래 링크로 신청해주세요!`);
  lines.push(`👉 ${shareUrl}`);
  return lines.join("\n");
}

function generateEvent(meetup: MeetupData, shareUrl: string): string {
  const lines: string[] = [];
  lines.push(`🔥 ${meetup.title}`);
  lines.push("");
  if (meetup.location) lines.push(`📍 ${meetup.location}`);
  if (meetup.scheduleStart) {
    const start = new Date(meetup.scheduleStart).toLocaleDateString();
    const end = meetup.scheduleEnd ? ` ~ ${new Date(meetup.scheduleEnd).toLocaleDateString()}` : "";
    lines.push(`📅 ${start}${end}`);
  }
  lines.push("");
  lines.push(`✨ 놓치지 마세요! 지금 바로 참여하세요.`);
  lines.push("");
  lines.push(`🔗 ${shareUrl}`);
  if (meetup.invitedCountries && meetup.invitedCountries.length > 0) {
    lines.push("");
    lines.push(`#${meetup.invitedCountries.join(" #")} #meetup #travel`);
  } else {
    lines.push("");
    lines.push(`#meetup #travel #networking`);
  }
  return lines.join("\n");
}

describe("MeetupShareModal - 추천글 생성", () => {
  const mockMeetup: MeetupData = {
    id: 1,
    title: "서울 Web3 밋업",
    description: "블록체인 기술과 Web3 생태계에 대해 논의하는 밋업입니다.",
    location: "서울 강남구 코엑스",
    scheduleStart: "2026-06-15T00:00:00.000Z",
    scheduleEnd: "2026-06-17T00:00:00.000Z",
    maxParticipants: 50,
    invitedCountries: ["한국", "일본", "중국"],
    projectCode: "104.340.300",
    shareToken: "abc123",
  };

  const shareUrl = "https://meetup-travel.1page.to/m/abc123";

  it("밋업 요약 추천글이 올바르게 생성된다", () => {
    const text = generateSummary(mockMeetup, shareUrl);
    expect(text).toContain("✈️ 서울 Web3 밋업");
    expect(text).toContain("📍 장소: 서울 강남구 코엑스");
    expect(text).toContain("📅 기간:");
    expect(text).toContain("👥 최대 인원: 50명");
    expect(text).toContain("🌍 초청국가: 한국, 일본, 중국");
    expect(text).toContain(shareUrl);
  });

  it("초대장 추천글이 올바르게 생성된다", () => {
    const text = generateInvite(mockMeetup, shareUrl);
    expect(text).toContain("🎉 밋업에 초대합니다!");
    expect(text).toContain("📌 서울 Web3 밋업");
    expect(text).toContain("📍 서울 강남구 코엑스");
    expect(text).toContain("블록체인 기술과 Web3 생태계");
    expect(text).toContain(shareUrl);
  });

  it("이벤트 홍보 추천글이 올바르게 생성된다", () => {
    const text = generateEvent(mockMeetup, shareUrl);
    expect(text).toContain("🔥 서울 Web3 밋업");
    expect(text).toContain("📍 서울 강남구 코엑스");
    expect(text).toContain("✨ 놓치지 마세요!");
    expect(text).toContain("#한국 #일본 #중국 #meetup #travel");
    expect(text).toContain(shareUrl);
  });

  it("선택적 필드가 없을 때도 정상 생성된다", () => {
    const minimalMeetup: MeetupData = {
      id: 2,
      title: "간단한 밋업",
    };
    const text = generateSummary(minimalMeetup, shareUrl);
    expect(text).toContain("✈️ 간단한 밋업");
    expect(text).not.toContain("📍");
    expect(text).not.toContain("📅");
    expect(text).not.toContain("👥");
    expect(text).toContain(shareUrl);
  });

  it("description이 100자를 초과하면 잘린다 (초대장)", () => {
    const longDescMeetup: MeetupData = {
      id: 3,
      title: "테스트",
      description: "A".repeat(150),
    };
    const text = generateInvite(longDescMeetup, shareUrl);
    expect(text).toContain("A".repeat(100) + "...");
    expect(text).not.toContain("A".repeat(101));
  });

  it("초청국가가 없으면 기본 해시태그가 사용된다 (이벤트)", () => {
    const noCountryMeetup: MeetupData = {
      id: 4,
      title: "테스트",
    };
    const text = generateEvent(noCountryMeetup, shareUrl);
    expect(text).toContain("#meetup #travel #networking");
  });

  it("공유 URL이 모든 추천글에 포함된다", () => {
    const texts = [
      generateSummary(mockMeetup, shareUrl),
      generateInvite(mockMeetup, shareUrl),
      generateEvent(mockMeetup, shareUrl),
    ];
    texts.forEach(text => {
      expect(text).toContain(shareUrl);
    });
  });
});
