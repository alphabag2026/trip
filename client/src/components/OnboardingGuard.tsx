import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * 온보딩 가드: 온보딩 강제 리다이렉트를 완전히 제거
 * 모든 페이지에서 자유롭게 접근 가능하며, 온보딩 미완료 시 홈 화면에 배너로 안내
 * 
 * 이전 동작: 온보딩 미완료 시 /onboarding으로 강제 리다이렉트
 * 현재 동작: 리다이렉트 없음, 모든 페이지 자유 접근
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  // 온보딩 상태는 Home.tsx에서 배너로 표시하므로 여기서는 아무것도 하지 않음
  return <>{children}</>;
}
