export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Always redirect to local login page (no external OAuth)
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath) {
    return `/login?returnPath=${encodeURIComponent(returnPath)}`;
  }
  return "/login";
};
