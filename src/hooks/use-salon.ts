import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySalon, getSalonData } from "@/lib/salon.functions";

export function useSalon() {
  const fn = useServerFn(getMySalon);
  return useQuery({ queryKey: ["salon"], queryFn: () => fn() });
}

export function useSalonData(salonId: string | undefined) {
  const fn = useServerFn(getSalonData);
  return useQuery({
    queryKey: ["salon-data", salonId],
    queryFn: () => fn({ data: { salonId: salonId as string } }),
    enabled: Boolean(salonId),
  });
}