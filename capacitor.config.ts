import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.alphatrip.app",
  appName: "Alpha Trip",
  webDir: "dist/public",
  server: {
    // 프로덕션: 배포된 서버를 가리킴 (웹뷰가 서버에서 로드)
    url: "https://meetup-trav-9l2ufkgm.manus.space",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f172a",
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false,
      androidSpinnerStyle: "small",
      spinnerColor: "#6366f1",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
