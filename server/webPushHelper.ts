/**
 * 웹 푸시 알림 발송 헬퍼
 * 지오펜싱, 항공편 지연, 일정 변경, 새 메시지 등 다양한 이벤트에서 공용 사용
 */
import webpush from "web-push";
import * as db from "./db";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

interface PushSubscription {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function initVapid() {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
  if (!vapidPublic || !vapidPrivate) return false;
  webpush.setVapidDetails("mailto:admin@meetup-travel.1page.to", vapidPublic, vapidPrivate);
  return true;
}

/**
 * 특정 구독 목록에 웹 푸시 발송
 */
export async function sendWebPush(subscriptions: PushSubscription[], payload: PushPayload): Promise<number> {
  if (!initVapid() || subscriptions.length === 0) return 0;
  
  let sent = 0;
  const payloadStr = JSON.stringify({
    ...payload,
    icon: payload.icon || "/favicon.ico",
  });
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
      sent++;
    } catch (err: any) {
      // 만료된 구독 자동 삭제
      if (err.statusCode === 410 || err.statusCode === 404) {
        try { await db.deletePushSubscription(sub.endpoint); } catch {}
      }
    }
  }
  return sent;
}

/**
 * 관리자에게 웹 푸시 발송
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<number> {
  const subs = await db.getAdminPushSubscriptions();
  return sendWebPush(subs as PushSubscription[], payload);
}

/**
 * 특정 사용자 목록에게 웹 푸시 발송
 */
export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<number> {
  const subs = await db.getPushSubscriptionsByUserIds(userIds);
  return sendWebPush(subs as PushSubscription[], payload);
}

/**
 * 밋업 참가자에게 웹 푸시 발송
 */
export async function sendPushToMeetupParticipants(meetupId: number, payload: PushPayload): Promise<number> {
  const subs = await db.getPushSubscriptionsByMeetupId(meetupId);
  return sendWebPush(subs as PushSubscription[], payload);
}

/**
 * 채팅방 멤버에게 웹 푸시 발송 (발신자 제외)
 */
export async function sendPushToChatRoomMembers(roomId: number, excludeUserId: number, payload: PushPayload): Promise<number> {
  const subs = await db.getPushSubscriptionsByChatRoom(roomId, excludeUserId);
  return sendWebPush(subs as PushSubscription[], payload);
}
