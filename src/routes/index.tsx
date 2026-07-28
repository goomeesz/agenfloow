import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays, QrCode, BarChart3, Users, Clock, Sparkles, Check, ArrowRight,
} from "lucide-react";
import logo from "@/assets/agenbella-logo.png.asset.json";
import hero from "@/assets/hero-salon.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgenFloow — Agendamentos simples. Negócios organizados." },
      {
        name: "description",
        content:
          "Organize agendamentos, clientes, serviços e horários do seu salão em um só lugar. Link público, QR Code e relatórios.",
      },
      { property: "og:title", content: "AgenFloow — Agendamentos simples. Negócios organizados." },
      {
        property: "og:description",
        content: "Organize agendamentos, clientes, serviços e horários do seu salão em um só lugar. Link público, QR Code e relatórios.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: CalendarDays, title: "Agenda visual", text: "Veja o dia, a semana e o mês com todos os atendimentos organizados por profissional." },
  { icon: QrCode, title: "Link e QR Code", text: "Sua página pública de agendamento pronta para balcão, Instagram e WhatsApp." },
  { icon: Users, title: "Clientes na palma da mão", text: "Histórico, serviços preferidos, último e próximo atendimento de cada cliente." },
  { icon: BarChart3, title: "Relatórios do salão", text: "Dias mais movimentados, serviços mais procurados e evolução de clientes." },
  { icon: Clock, title: "Zero conflito de horário", text: "O sistema só mostra horários realmente livres para o cliente escolher." },
  { icon: Sparkles, title: "Sua identidade visual", text: "Logo, cores e informações do seu negócio na página vista pelo cliente." },
];

const problems = [
  "Caderno de papel e anotações soltas",
  "Conversas perdidas no WhatsApp",
  "Horários marcados em duplicidade",
  "Clientes que somem sem lembrete",
  "Horários vazios no meio do dia",
  "Nenhuma visão do movimento do salão",
];

function Index() {
  return (
    <div className="min-h-screen bg-soft-gradient">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <img src={logo.url} alt="AgenFloow" className="h-10 w-10 shrink-0 rounded-lg object-cover object-top" />
          <span className="font-display text-xl">AgenFloow</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/auth">Entrar na minha conta</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-soft px-3 py-1 text-xs font-semibold text-plum">
            <Sparkles className="size-3.5" /> Feito para profissionais de beleza
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl">
            A agenda inteligente do <span className="text-gradient-brand">seu salão</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Pare de depender de cadernos e mensagens espalhadas. Organize todos os agendamentos do
            seu salão em um só lugar — com link público, QR Code e relatórios do seu movimento.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/onboarding">Criar meu negócio <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Ver demonstração</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Salões, barbearias, nail designers, lash designers e estética.
          </p>
        </div>
        <div className="relative">
          <img
            src={hero}
            alt="Interior de salão de beleza moderno em tons de rosa"
            width={1600}
            height={1200}
            className="w-full rounded-3xl object-cover shadow-lift"
          />
          <div className="absolute -bottom-6 left-4 hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:block">
            <p className="text-xs text-muted-foreground">Agendamentos hoje</p>
            <p className="font-display text-3xl">10</p>
            <p className="text-xs text-success">+3 vs. ontem</p>
          </div>
        </div>
      </section>

      <section className="bg-plum py-16 text-plum-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-2xl text-3xl">Você reconhece alguma dessas situações?</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p) => (
              <li key={p} className="rounded-2xl bg-white/8 px-4 py-3.5 text-sm text-plum-foreground/85">
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-plum-foreground/70">
            O AgenFloow centraliza tudo em uma plataforma simples, visual e fácil de usar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl">Tudo o que o seu salão precisa</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1">
              <div className="grid size-11 place-items-center rounded-xl bg-rose-soft text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-brand-gradient px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="text-3xl text-primary-foreground sm:text-4xl">Comece a organizar hoje</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Configure seu salão em poucos minutos e receba agendamentos pelo seu link exclusivo.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/onboarding">Criar meu negócio</Link>
            </Button>
          </div>
          <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/85">
            {["Sem instalação", "Página pública pronta", "QR Code incluso"].map((i) => (
              <li key={i} className="flex items-center gap-2"><Check className="size-4" /> {i}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        AgenFloow — a agenda inteligente do seu salão.
      </footer>
    </div>
  );
}
