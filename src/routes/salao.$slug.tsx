import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Instagram, Clock, Check, CalendarPlus, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/agenbella-logo.png.asset.json";
import { brl, isoDate, prettyDate, weekdayNames } from "@/lib/salon-data";
import { createPublicBooking, getPublicSalon, getPublicSlots } from "@/lib/public-booking.functions";

export const Route = createFileRoute("/salao/$slug")({
  loader: ({ params }) => getPublicSalon({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const name = loaderData?.salon.name ?? "Agendamento online";
    return {
      meta: [
        { title: `Agende seu horário — ${name}` },
        { name: "description", content: `Escolha serviço, profissional, data e horário e agende online no ${name}.` },
        { property: "og:title", content: `Agende seu horário — ${name}` },
        { property: "og:description", content: "Agendamento online rápido e sem conversa no WhatsApp." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => <Unavailable />,
  notFoundComponent: () => <Unavailable />,
  component: PublicBooking,
});

function Unavailable() {
  return (
    <div className="grid min-h-screen place-items-center bg-soft-gradient px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl">Página indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este salão não está aceitando agendamentos online no momento.
        </p>
      </div>
    </div>
  );
}

const todayIso = isoDate(new Date());

function PublicBooking() {
  const data = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [service, setService] = useState<string | null>(null);
  const [pro, setPro] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const slotsFn = useServerFn(getPublicSlots);
  const bookFn = useServerFn(createPublicBooking);

  const { data: slots = [], isFetching } = useQuery({
    queryKey: ["slots", slug, date, service, pro],
    queryFn: () => slotsFn({ data: { slug, date, serviceId: service as string, professionalId: pro } }),
    enabled: Boolean(service),
  });

  if (!data) return <Unavailable />;

  const { salon, services, professionals, hours } = data as {
    salon: { id: string; name: string; slug: string; address: string | null; instagram: string | null; business_type: string | null; logo_url: string | null; whatsapp: string | null };
    services: Array<{ id: string; name: string; description: string | null; price: number; duration: number; professional_id: string | null }>;
    professionals: Array<{ id: string; name: string }>;
    hours: Array<{ weekday: number; closed: boolean; open_time: string | null; close_time: string | null }>;
  };
  const selected = services.find((s) => s.id === service);
  const canConfirm = Boolean(service && time && name.trim() && phone.trim());

  const confirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      await bookFn({
        data: {
          slug,
          serviceId: service as string,
          professionalId: pro,
          date,
          time: time as string,
          name: name.trim(),
          phone: phone.trim(),
        },
      });
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível agendar");
    } finally {
      setSaving(false);
    }
  };

  if (done && selected) {
    return (
      <div className="min-h-screen bg-soft-gradient px-4 py-10">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-lift">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success">
            <Check className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl">Agendamento confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Te esperamos no {salon.name}.</p>
          <dl className="mt-6 grid gap-3 text-left text-sm">
            {[
              ["Serviço", selected.name],
              ["Profissional", professionals.find((p) => p.id === pro)?.name ?? "Equipe"],
              ["Data", prettyDate(date)],
              ["Horário", time as string],
              ["Valor", brl(Number(selected.price))],
              ["Endereço", salon.address ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-border pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid gap-2">
            <Button asChild>
              <a
                download={`agendamento-${salon.slug}.ics`}
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                  `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${selected.name} - ${salon.name}\nDTSTART:${date.replace(/-/g, "")}T${(time as string).replace(":", "")}00\nLOCATION:${salon.address ?? ""}\nEND:VEVENT\nEND:VCALENDAR`,
                )}`}
              >
                <CalendarPlus className="size-4" /> Adicionar ao calendário
              </a>
            </Button>
            {salon.whatsapp && (
              <Button variant="outline" asChild>
                <a href={`https://wa.me/${salon.whatsapp}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> Falar com o salão
                </a>
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setDone(false); setTime(null); }}>
              <ArrowLeft className="size-4" /> Fazer outro agendamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const openDays = hours.filter((h) => !h.closed && h.open_time);

  return (
    <div className="min-h-screen bg-soft-gradient pb-16">
      <header className="bg-brand-gradient px-4 pt-10 pb-14 text-primary-foreground sm:px-6">
        <div className="mx-auto max-w-2xl">
          <img src={salon.logo_url ?? logo.url} alt={salon.name} className="size-16 rounded-2xl bg-white object-cover object-top" />
          <h1 className="mt-4 text-3xl text-primary-foreground">{salon.name}</h1>
          <p className="mt-1 text-sm text-primary-foreground/85">{salon.business_type ?? "Beleza & estética"}</p>
          <ul className="mt-4 grid gap-1.5 text-sm text-primary-foreground/85">
            {salon.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /> {salon.address}</li>}
            {salon.instagram && <li className="flex items-center gap-2"><Instagram className="size-4 shrink-0" /> {salon.instagram}</li>}
            {openDays.length > 0 && (
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                {weekdayNames[openDays[0].weekday].slice(0, 3)} a {weekdayNames[openDays[openDays.length - 1].weekday].slice(0, 3)} ·{" "}
                {openDays[0].open_time} às {openDays[0].close_time}
              </li>
            )}
          </ul>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-2xl space-y-4 px-4 sm:px-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-lg">1. Escolha o serviço</h2>
          <div className="mt-4 grid gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setService(s.id); setPro(s.professional_id); setTime(null); }}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  service === s.id ? "border-primary bg-rose-soft" : "border-border hover:bg-secondary"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.description ?? ""} · {s.duration} min</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-primary">{brl(Number(s.price))}</span>
              </button>
            ))}
            {services.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço disponível.</p>}
          </div>
        </section>

        {professionals.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-lg">2. Escolha o profissional</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {professionals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPro(p.id); setTime(null); }}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    pro === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-lg">3. Data e horário</h2>
          <div className="mt-4 grid gap-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={date} min={todayIso} onChange={(e) => { setDate(e.target.value); setTime(null); }} />
          </div>
          {!service && <p className="mt-3 text-xs text-muted-foreground">Escolha um serviço para ver os horários livres.</p>}
          {service && isFetching && <p className="mt-3 text-xs text-muted-foreground">Buscando horários…</p>}
          {service && !isFetching && slots.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">Sem horários para esta data.</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.available}
                onClick={() => setTime(s.time)}
                className={`rounded-xl border px-2 py-2 text-sm transition-colors ${
                  !s.available
                    ? "cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through"
                    : time === s.time
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary"
                }`}
              >
                {s.time}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-lg">4. Seus dados</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2"><Label htmlFor="nome">Nome</Label><Input id="nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></div>
            <div className="grid gap-2"><Label htmlFor="wpp">WhatsApp</Label><Input id="wpp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" /></div>
          </div>
          <Button className="mt-5 w-full" size="lg" disabled={!canConfirm || saving} onClick={confirm}>
            {saving ? "Confirmando…" : "Confirmar agendamento"}
          </Button>
          {!canConfirm && <p className="mt-2 text-center text-xs text-muted-foreground">Preencha serviço, horário e seus dados.</p>}
        </section>

        <p className="pt-2 text-center text-xs text-muted-foreground">Agendamento online por AgenFloow</p>
      </div>
    </div>
  );
}
