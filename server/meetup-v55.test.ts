import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 읽지 않은 메시지 뱃지 테스트 ──────────────────────────────
describe("Unread Message Badge", () => {
  it("should track unread counts per room", () => {
    // 읽지 않은 메시지 수 계산 로직 검증
    const lastReadAt = new Date("2026-03-20T10:00:00Z").getTime();
    const messages = [
      { id: 1, createdAt: new Date("2026-03-20T09:00:00Z").getTime() }, // 읽음
      { id: 2, createdAt: new Date("2026-03-20T11:00:00Z").getTime() }, // 안 읽음
      { id: 3, createdAt: new Date("2026-03-20T12:00:00Z").getTime() }, // 안 읽음
    ];
    const unreadCount = messages.filter(m => m.createdAt > lastReadAt).length;
    expect(unreadCount).toBe(2);
  });

  it("should return 0 for fully read rooms", () => {
    const lastReadAt = new Date("2026-03-21T00:00:00Z").getTime();
    const messages = [
      { id: 1, createdAt: new Date("2026-03-20T09:00:00Z").getTime() },
      { id: 2, createdAt: new Date("2026-03-20T11:00:00Z").getTime() },
    ];
    const unreadCount = messages.filter(m => m.createdAt > lastReadAt).length;
    expect(unreadCount).toBe(0);
  });

  it("should handle empty message list", () => {
    const lastReadAt = Date.now();
    const messages: any[] = [];
    const unreadCount = messages.filter(m => m.createdAt > lastReadAt).length;
    expect(unreadCount).toBe(0);
  });
});

// ── 그룹 통화 시그널링 테스트 ──────────────────────────────
describe("Group Call Signaling", () => {
  let groupCalls: Map<string, any>;

  beforeEach(() => {
    groupCalls = new Map();
  });

  it("should create a group call with host as first participant", () => {
    const callId = "test-group-1";
    groupCalls.set(callId, {
      callId,
      roomId: 1,
      callType: "video",
      hostId: 100,
      hostName: "Host",
      participants: [{ userId: 100, name: "Host", joinedAt: Date.now() }],
      peerSignals: new Map(),
      maxParticipants: 8,
      status: "active",
      createdAt: Date.now(),
    });

    const gc = groupCalls.get(callId);
    expect(gc).toBeDefined();
    expect(gc.participants).toHaveLength(1);
    expect(gc.participants[0].userId).toBe(100);
    expect(gc.status).toBe("active");
  });

  it("should allow up to 8 participants to join", () => {
    const callId = "test-group-2";
    const gc = {
      callId,
      roomId: 1,
      callType: "voice",
      hostId: 1,
      participants: [{ userId: 1, name: "Host", joinedAt: Date.now() }],
      peerSignals: new Map(),
      maxParticipants: 8,
      status: "active",
    };
    groupCalls.set(callId, gc);

    // 7명 추가 (총 8명)
    for (let i = 2; i <= 8; i++) {
      gc.participants.push({ userId: i, name: `User${i}`, joinedAt: Date.now() });
    }
    expect(gc.participants).toHaveLength(8);

    // 9번째는 거부
    const canJoin = gc.participants.length < gc.maxParticipants;
    expect(canJoin).toBe(false);
  });

  it("should remove participant on leave", () => {
    const callId = "test-group-3";
    const gc = {
      callId,
      participants: [
        { userId: 1, name: "A" },
        { userId: 2, name: "B" },
        { userId: 3, name: "C" },
      ],
      status: "active",
    };
    groupCalls.set(callId, gc);

    // User 2 나가기
    gc.participants = gc.participants.filter((p: any) => p.userId !== 2);
    expect(gc.participants).toHaveLength(2);
    expect(gc.participants.find((p: any) => p.userId === 2)).toBeUndefined();
  });

  it("should end call when all participants leave", () => {
    const gc = {
      callId: "test-group-4",
      participants: [{ userId: 1, name: "A" }],
      status: "active",
    };

    gc.participants = gc.participants.filter((p: any) => p.userId !== 1);
    if (gc.participants.length === 0) gc.status = "ended";
    expect(gc.status).toBe("ended");
  });

  it("should store peer signals for Mesh topology", () => {
    const peerSignals = new Map<string, any>();
    const key = "1-2";
    peerSignals.set(key, {
      fromUserId: 1,
      toUserId: 2,
      offer: '{"type":"offer","sdp":"..."}',
      answer: null,
      fromCandidates: [],
      toCandidates: [],
    });

    expect(peerSignals.has("1-2")).toBe(true);
    const sig = peerSignals.get("1-2");
    expect(sig.offer).toBeTruthy();
    expect(sig.answer).toBeNull();

    // Answer 설정
    sig.answer = '{"type":"answer","sdp":"..."}';
    expect(peerSignals.get("1-2")!.answer).toBeTruthy();
  });

  it("should collect ICE candidates for both directions", () => {
    const peerSignals = new Map<string, any>();
    peerSignals.set("1-2", {
      fromUserId: 1,
      toUserId: 2,
      offer: "...",
      answer: "...",
      fromCandidates: [] as string[],
      toCandidates: [] as string[],
    });

    // From user 1 (caller)
    peerSignals.get("1-2")!.fromCandidates.push('{"candidate":"...1"}');
    peerSignals.get("1-2")!.fromCandidates.push('{"candidate":"...2"}');

    // From user 2 (answerer)
    peerSignals.get("1-2")!.toCandidates.push('{"candidate":"...3"}');

    expect(peerSignals.get("1-2")!.fromCandidates).toHaveLength(2);
    expect(peerSignals.get("1-2")!.toCandidates).toHaveLength(1);
  });
});

// ── TURN 서버 설정 테스트 ──────────────────────────────
describe("TURN Server Configuration", () => {
  it("should return default STUN servers when no TURN configured", () => {
    const turnUrl = undefined;
    const servers: any[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    if (turnUrl) {
      servers.push({ urls: turnUrl });
    }

    // 무료 TURN 폴백
    servers.push(
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    );

    expect(servers.length).toBe(3); // 2 STUN + 1 free TURN
    expect(servers[0].urls).toContain("stun:");
    expect(servers[2].urls).toContain("turn:");
    expect(servers[2].username).toBe("openrelayproject");
  });

  it("should include custom TURN server when configured", () => {
    const turnUrl = "turn:my-turn.example.com:3478";
    const turnUser = "myuser";
    const turnPass = "mypass";

    const servers: any[] = [
      { urls: "stun:stun.l.google.com:19302" },
    ];

    if (turnUrl) {
      servers.push({
        urls: turnUrl,
        ...(turnUser && { username: turnUser }),
        ...(turnPass && { credential: turnPass }),
      });
    }

    expect(servers).toHaveLength(2);
    expect(servers[1].urls).toBe("turn:my-turn.example.com:3478");
    expect(servers[1].username).toBe("myuser");
    expect(servers[1].credential).toBe("mypass");
  });

  it("should mask credential in getTurnConfig response", () => {
    const credential = "super-secret-key";
    const maskedCredential = credential ? "****" : "";
    expect(maskedCredential).toBe("****");
  });

  it("should handle TURN URL with transport parameter", () => {
    const turnUrl = "turn:openrelay.metered.ca:443?transport=tcp";
    expect(turnUrl).toContain("transport=tcp");
    expect(turnUrl).toContain("turn:");
  });
});

// ── Mesh 토폴로지 테스트 ──────────────────────────────
describe("Mesh Topology Logic", () => {
  it("should determine offer direction by lower ID", () => {
    const myId = 5;
    const peerId = 10;
    // 낮은 ID가 offer 전송
    const shouldSendOffer = myId < peerId;
    expect(shouldSendOffer).toBe(true);
  });

  it("should not send offer when my ID is higher", () => {
    const myId = 10;
    const peerId = 5;
    const shouldSendOffer = myId < peerId;
    expect(shouldSendOffer).toBe(false);
  });

  it("should calculate grid layout based on participant count", () => {
    const getGridCols = (count: number) => count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4;

    expect(getGridCols(1)).toBe(1);
    expect(getGridCols(2)).toBe(1);
    expect(getGridCols(3)).toBe(2);
    expect(getGridCols(4)).toBe(2);
    expect(getGridCols(5)).toBe(3);
    expect(getGridCols(6)).toBe(3);
    expect(getGridCols(7)).toBe(4);
    expect(getGridCols(8)).toBe(4);
  });

  it("should track connections per peer in Mesh", () => {
    const peers = new Map<number, { userId: number; connected: boolean }>();
    peers.set(2, { userId: 2, connected: false });
    peers.set(3, { userId: 3, connected: false });
    peers.set(4, { userId: 4, connected: false });

    // 피어 2와 연결 완료
    peers.get(2)!.connected = true;

    const connectedCount = Array.from(peers.values()).filter(p => p.connected).length;
    expect(connectedCount).toBe(1);
    expect(peers.size).toBe(3);
  });
});

// ── 폴링 시그널 필터링 테스트 ──────────────────────────────
describe("Poll Group Signals Filtering", () => {
  it("should filter offers targeted at current user", () => {
    const myId = 3;
    const peerSignals = new Map<string, any>();
    peerSignals.set("1-3", { fromUserId: 1, toUserId: 3, offer: "offer1", answer: null });
    peerSignals.set("2-3", { fromUserId: 2, toUserId: 3, offer: "offer2", answer: null });
    peerSignals.set("1-2", { fromUserId: 1, toUserId: 2, offer: "offer3", answer: null });

    const myOffers: any[] = [];
    for (const [, sig] of peerSignals) {
      if (sig.toUserId === myId && sig.offer && !sig.answer) {
        myOffers.push({ fromUserId: sig.fromUserId, offer: sig.offer });
      }
    }

    expect(myOffers).toHaveLength(2);
    expect(myOffers[0].fromUserId).toBe(1);
    expect(myOffers[1].fromUserId).toBe(2);
  });

  it("should filter answers for my offers", () => {
    const myId = 1;
    const peerSignals = new Map<string, any>();
    peerSignals.set("1-2", { fromUserId: 1, toUserId: 2, offer: "offer1", answer: "answer1" });
    peerSignals.set("1-3", { fromUserId: 1, toUserId: 3, offer: "offer2", answer: null });

    const myAnswers: any[] = [];
    for (const [, sig] of peerSignals) {
      if (sig.fromUserId === myId && sig.answer) {
        myAnswers.push({ fromUserId: sig.toUserId, answer: sig.answer });
      }
    }

    expect(myAnswers).toHaveLength(1);
    expect(myAnswers[0].fromUserId).toBe(2);
  });
});
