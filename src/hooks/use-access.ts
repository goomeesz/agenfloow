import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccess } from "@/lib/subscription.functions";
import { listNotifications } from "@/lib/notifications.functions";

export function useAccess(salonId: string | undefined) {
  const fn = useServerFn(getAccess);
  return useQuery({
    queryKey: ["access", salonId],
    queryFn: () => fn({ data: { salonId: salonId as string } }),
    enabled: Boolean(salonId),
  });
}

export function useNotifications(salonId: string | undefined) {
  const fn = useServerFn(listNotifications);
  return useQuery({
    queryKey: ["notifications", salonId],
    queryFn: () => fn({ data: { salonId: salonId as string } }),
    enabled: Boolean(salonId),
    refetchInterval: 60000,
  });
}