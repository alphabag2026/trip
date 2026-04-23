import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Onboarding Tour", () => {
  // 1. OnboardingTour 컴포넌트 파일 존재 확인
  it("OnboardingTour component file exists", () => {
    const filePath = path.resolve(__dirname, "../client/src/components/OnboardingTour.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  // 2. 컴포넌트가 올바른 export를 가지고 있는지 확인
  it("exports OnboardingTour and resetOnboardingTour", () => {
    const filePath = path.resolve(__dirname, "../client/src/components/OnboardingTour.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("export function OnboardingTour");
    expect(content).toContain("export function resetOnboardingTour");
  });

  // 3. 투어 스텝이 8단계인지 확인
  it("has 8 tour steps (welcome → profile → passport → meetup → chat → nearby → safety → complete)", () => {
    const filePath = path.resolve(__dirname, "../client/src/components/OnboardingTour.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const stepMatches = content.match(/id:\s*"/g);
    expect(stepMatches).not.toBeNull();
    expect(stepMatches!.length).toBe(8);
    
    // 각 스텝 ID 확인
    expect(content).toContain('id: "welcome"');
    expect(content).toContain('id: "profile"');
    expect(content).toContain('id: "passport"');
    expect(content).toContain('id: "meetup"');
    expect(content).toContain('id: "chat"');
    expect(content).toContain('id: "nearby"');
    expect(content).toContain('id: "safety"');
    expect(content).toContain('id: "complete"');
  });

  // 4. localStorage 키가 올바른지 확인
  it("uses correct localStorage key for tour completion", () => {
    const filePath = path.resolve(__dirname, "../client/src/components/OnboardingTour.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('TOUR_STORAGE_KEY = "alphatrip_tour_completed"');
  });

  // 5. Home.tsx에 OnboardingTour가 통합되어 있는지 확인
  it("OnboardingTour is integrated in Home.tsx", () => {
    const filePath = path.resolve(__dirname, "../client/src/pages/Home.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('import { OnboardingTour }');
    expect(content).toContain('<OnboardingTour');
  });

  // 6. data-tour 속성이 Home.tsx에 추가되어 있는지 확인
  it("Home.tsx has data-tour attributes for tour targeting", () => {
    const filePath = path.resolve(__dirname, "../client/src/pages/Home.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('data-tour="profile"');
    expect(content).toContain('tourId: "meetup"');
    expect(content).toContain('tourId: "chat"');
    expect(content).toContain('tourId: "nearby"');
    expect(content).toContain('tourId: "safety"');
  });

  // 7. 다국어 번역 키가 모든 locale에 존재하는지 확인
  it("tour translation keys exist in all locale files", () => {
    const localeDir = path.resolve(__dirname, "../client/src/locales");
    const requiredKeys = [
      "tour.welcomeTitle", "tour.welcomeDesc",
      "tour.profileTitle", "tour.profileDesc",
      "tour.meetupTitle", "tour.meetupDesc",
      "tour.chatTitle", "tour.chatDesc",
      "tour.skip", "tour.next", "tour.prev", "tour.getStarted"
    ];
    
    const files = fs.readdirSync(localeDir).filter(f => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(10);
    
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf-8"));
      for (const key of requiredKeys) {
        expect(data[key], `Missing key "${key}" in ${file}`).toBeDefined();
      }
    }
  });

  // 8. 투어 컴포넌트에 진행률 바가 있는지 확인
  it("has progress bar UI", () => {
    const filePath = path.resolve(__dirname, "../client/src/components/OnboardingTour.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("progress");
    expect(content).toContain("TOUR_STEPS.length");
  });

  // 9. 건너뛰기 기능이 있는지 확인
  it("has skip functionality", () => {
    const filePath = path.resolve(__dirname, "../client/src/components/OnboardingTour.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("handleSkip");
    expect(content).toContain("tour.skip");
  });

  // 10. 투어가 인증된 사용자에게만 표시되는지 확인
  it("tour is only shown to authenticated users", () => {
    const filePath = path.resolve(__dirname, "../client/src/pages/Home.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("isAuthenticated && <OnboardingTour");
  });
});
