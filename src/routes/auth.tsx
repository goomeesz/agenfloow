import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/agenfloow-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no AgenFloow — agenda do seu salão" },
      {
        name: "description",
        content: "Acesse sua conta AgenFloow para gerenciar agendamentos, clientes e equipe do seu salão.",
      },
      { property: "og:title", content: "Entrar no AgenFloow" },
      { property: "og:description", content: "Acesse a agenda inteligente do seu salão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Confira seu e-mail para confirmar a conta.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-soft-gradient px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mx-auto flex w-fit items-center gap-2">
          <img src={logo} alt="AgenFloow" className="h-10 w-10 rounded-lg object-cover object-top" />
          <span className="font-display text-xl">AgenFloow</span>
        </Link>

        <div className="mt-6 rounded-3xl border border-border bg-card p-7 shadow-lift">
          <h1 className="text-2xl">{mode === "entrar" ? "Entrar" : "Criar conta"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A agenda inteligente do seu salão, em um só lugar.
          </p>

          <Tabs value={mode} onValueChange={setMode} className="mt-5">
            <TabsList className="w-full">
              <TabsTrigger value="entrar" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="criar" className="flex-1">Criar conta</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-5 grid gap-4">
            {mode === "criar" && (
              <div className="grid gap-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input id="nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bella Nunes" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@salao.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={submit} disabled={loading || !email || !password}>
              {loading ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar minha conta"}
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continuar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}