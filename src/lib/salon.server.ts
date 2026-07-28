// Server-only helpers for salon domain logic.
export const DEFAULT_SERVICES = [
  { name: "Corte feminino", description: "Corte + finalização", price: 120, duration: 60 },
  { name: "Corte masculino", description: "Máquina e tesoura", price: 70, duration: 40 },
  { name: "Escova", description: "Escova modelada", price: 90, duration: 45 },
  { name: "Coloração", description: "Cor completa", price: 320, duration: 150 },
  { name: "Manicure", description: "Esmaltação tradicional", price: 55, duration: 45 },
  { name: "Pedicure", description: "Spa dos pés", price: 65, duration: 50 },
  { name: "Design de sobrancelhas", description: "Com henna opcional", price: 60, duration: 30 },
];

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "salao";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type Busy = { time: string; duration: number };

export function buildSlots(
  open: string,
  close: string,
  duration: number,
  busy: Busy[],
  step = 30,
): { time: string; available: boolean }[] {
  const start = toMinutes(open);
  const end = toMinutes(close);
  const blocks = busy.map((b) => [toMinutes(b.time), toMinutes(b.time) + b.duration] as const);
  const slots: { time: string; available: boolean }[] = [];
  for (let t = start; t + duration <= end; t += step) {
    const overlaps = blocks.some(([bs, be]) => t < be && t + duration > bs);
    slots.push({ time: fromMinutes(t), available: !overlaps });
  }
  return slots;
}