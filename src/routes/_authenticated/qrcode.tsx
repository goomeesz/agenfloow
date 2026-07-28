import { createFileRoute } from "@tanstack/react-router";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSalon } from "@/hooks/use-salon";
import { bookingUrl } from "@/lib/public-url";

export const Route = createFileRoute("/_authenticated/qrcode")({
  head: () => ({
    meta: [
      { title: "QR Code de agendamento — AgenFloow" },
      { name: "description", content: "Gere o QR Code do seu salão para balcão, Instagram, WhatsApp e cartões de visita." },
      { property: "og:title", content: "QR Code de agendamento — AgenFloow" },
      { property: "og:description", content: "Seu link de agendamento em qualquer lugar." },
    ],
  }),
  component: QrCodePage,
});

function QrCodePage() {
  const { data: salon } = useSalon();
  const slug = salon?.slug ?? "";
  const link = slug ? bookingUrl(slug) : "";

  const download = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#agenbella-qr canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qrcode-${slug}.png`;
    a.click();
    toast.success("QR Code baixado");
  };

  return (
    <AppShell title="QR Code" subtitle="Divulgue seu link de agendamento">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <div id="agenbella-qr" className="mx-auto grid w-fit place-items-center rounded-2xl bg-white p-5">
            {link ? (
              <QRCodeCanvas value={link} size={200} level="M" fgColor="#3a1140" />
            ) : (
              <div className="size-[200px] animate-pulse rounded-xl bg-muted" />
            )}
          </div>
          <p className="mt-4 font-display text-lg">{salon?.name ?? "Seu salão"}</p>
          <p className="text-xs break-all text-muted-foreground">{link}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={download} disabled={!link}><Download className="size-4" /> Baixar QR Code</Button>
            <Button
              variant="outline"
              disabled={!link}
              onClick={() => {
                navigator.clipboard?.writeText(link);
                toast.success("Link copiado");
              }}
            >
              <Copy className="size-4" /> Copiar link
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            O QR Code aponta para o seu site publicado. Se você ainda não publicou o AgenFloow, publique para que a leitura funcione.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Onde usar</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Balcão e recepção do salão", "Bio e Stories do Instagram", "Status e conversas do WhatsApp",
              "Cartões de visita", "Panfletos e materiais promocionais", "Embalagens e brindes",
            ].map((i) => (
              <li key={i} className="rounded-xl bg-secondary px-3.5 py-3 text-sm text-secondary-foreground">{i}</li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-rose-soft p-4 text-sm text-plum">
            <p className="flex items-center gap-2 font-medium"><Share2 className="size-4" /> Dica</p>
            <p className="mt-1 opacity-80">
              Imprima o QR Code em tamanho A6 e deixe no balcão: a cliente agenda o próximo horário antes de ir embora.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}