import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const { data: vapidData } = trpc.pushNotification.getVapidPublicKey.useQuery();
  const { data: mySubs } = trpc.pushNotification.getMySubscriptions.useQuery();
  const subscribeMut = trpc.pushNotification.subscribe.useMutation();
  const unsubscribeMut = trpc.pushNotification.unsubscribe.useMutation();
  const testPushMut = trpc.pushNotification.testPush.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (mySubs && mySubs.length > 0) {
      setIsSubscribed(true);
    } else {
      setIsSubscribed(false);
    }
  }, [mySubs]);

  const handleSubscribe = useCallback(async () => {
    if (!vapidData?.publicKey) {
      toast.error("VAPID 키가 설정되지 않았습니다.");
      return;
    }
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("브라우저 설정에서 알림을 허용해주세요.");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey) as any,
      });

      const subJson = subscription.toJSON();
      await subscribeMut.mutateAsync({
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      });

      setIsSubscribed(true);
      utils.pushNotification.getMySubscriptions.invalidate();
      toast.success("지오펜싱 알림을 실시간으로 받을 수 있습니다.");
    } catch (err: any) {
      console.error("Push subscribe error:", err);
      toast.error(err.message || "알림 구독에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [vapidData, subscribeMut, utils]);

  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await unsubscribeMut.mutateAsync({ endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
      }
      setIsSubscribed(false);
      utils.pushNotification.getMySubscriptions.invalidate();
      toast.success("더 이상 푸시 알림을 받지 않습니다.");
    } catch (err: any) {
      toast.error(err.message || "구독 해제에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMut, utils]);

  const handleTestPush = useCallback(async () => {
    try {
      const result = await testPushMut.mutateAsync();
      if (result.success) {
        toast.success(`${result.sent}개 기기에 테스트 알림을 발송했습니다.`);
      }
    } catch (err: any) {
      toast.error(err.message || "테스트 알림 발송에 실패했습니다.");
    }
  }, [testPushMut]);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>이 브라우저는 푸시 알림을 지원하지 않습니다.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isSubscribed ? "푸시 알림 활성화됨" : "푸시 알림 비활성화"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? "지오펜싱 진입/이탈 알림을 실시간으로 받습니다"
                : "활성화하면 모바일에서도 즉시 알림을 받을 수 있습니다"}
            </p>
          </div>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            "구독 해제"
          ) : (
            "알림 구독"
          )}
        </Button>
      </div>
      {isSubscribed && (
        <Button variant="outline" size="sm" onClick={handleTestPush} disabled={testPushMut.isPending} className="w-fit">
          {testPushMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          테스트 알림 보내기
        </Button>
      )}
      {permission === "denied" && (
        <p className="text-xs text-destructive">
          알림이 차단되어 있습니다. 브라우저 설정에서 이 사이트의 알림을 허용해주세요.
        </p>
      )}
    </div>
  );
}
