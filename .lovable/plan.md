## Objetivo

Transformar o AgenFloow em um Micro SaaS com teste grátis de 7 dias, assinatura **AgenFloow Pro — R$ 97/mês** via pagamento integrado (Stripe), bloqueio inteligente após o trial, central de notificações, página pública personalizável e campos extras de cadastro.

## 1. Assinatura e teste grátis

**Modelo de dados** (nova tabela `subscriptions`, uma por salão):
- `trial_started_at`, `trial_ends_at`
- `status`: `trial`, `trial_expiring`, `expired`, `active`, `canceled`
- `plan` (`pro`), `price_cents` (9700), `next_billing_date`
- IDs do provedor de pagamento + `payment_history` (tabela de pagamentos)

**Regras** (calculadas no servidor, nunca no navegador):
- O trial começa quando o usuário cria o primeiro negócio no onboarding — 7 dias exatos.
- `trial_expiring` quando faltam 3 dias ou menos; `expired` quando `trial_ends_at` passa sem assinatura ativa.
- Nenhum dado é apagado ao expirar.

**Bloqueio inteligente** (validado no back-end, não só na tela):
- Bloqueia: criar/editar agendamentos, criar clientes, relatórios e dashboard completo.
- Continua liberado: ver dados existentes em modo leitura, configurações, página de assinatura.
- A página pública do salão e o QR Code continuam **funcionando** — ou são desativados? (assumo: página pública permanece no ar, mas **não aceita novos agendamentos** enquanto expirado, para não prejudicar o cliente final com um link quebrado; mostra aviso amigável).
- Tela de bloqueio: "Seu período de teste gratuito terminou" + card do plano + botão "Ativar minha assinatura".

**Avisos de trial**: faixa discreta no topo do app com dias restantes (5/3/1/hoje) e link para assinar.

## 2. Pagamento (Stripe integrado)

- Ativar o pagamento integrado da Lovable com Stripe (sem conta externa; ambiente de teste primeiro).
- Criar o produto **AgenFloow Pro — R$ 97/mês** recorrente.
- Checkout a partir da página de Assinatura; webhook atualiza o status para `active`, grava próxima cobrança e histórico de pagamentos; cancelamento muda para `canceled` e mantém acesso até o fim do ciclo.
- Estrutura preparada para mais planos no futuro (tabela `plans` referenciada, hoje com um registro).

## 3. Página "Assinatura" (`/assinatura`)

Nova seção inferior do menu lateral (Assinatura · Perfil · Configurações).

- **Em trial**: barra de progresso "Dia 2 de 7", datas de início/fim, dias restantes, botão "Assinar AgenFloow Pro — R$ 97/mês".
- **Ativa**: plano, preço, próxima cobrança, método de pagamento, histórico, botões Gerenciar e Cancelar.
- **Expirada/cancelada**: card de reativação.

Também: página **Perfil** (nome, e-mail, senha) no rodapé do menu.

## 4. Central de notificações

- Tabela `notifications` por salão (tipo, título, mensagem, lida, link).
- Eventos geram notificação: novo agendamento (inclusive vindo da página pública), cancelamento, reagendamento, confirmação e lembrete do atendimento do dia.
- Sino no cabeçalho com contador de não lidas + painel com lista, marcar como lida e "marcar todas".

## 5. Página pública personalizável

- Novos campos do negócio: descrição, imagem de capa, foto/logo, cor secundária, e-mail.
- Upload de imagens (logo, capa, foto dos profissionais) em armazenamento de arquivos.
- A página `/salao/{slug}` passa a usar a identidade visual escolhida (cores, capa, logo, descrição, endereço, redes).
- Fluxo do cliente em etapas: serviço → profissional → data → horário → dados → confirmação, com botões "Adicionar ao calendário" (.ics) e "Falar no WhatsApp".

## 6. Campos extras de cadastro

- **Clientes**: WhatsApp e e-mail, além de telefone; filtros novos / recorrentes / inativos; último e próximo atendimento.
- **Profissionais**: foto, horários de trabalho, dias, intervalos, status.
- **Serviços × profissionais**: vínculo muitos-para-muitos, de modo que a página pública só ofereça o profissional que executa o serviço escolhido.

## Detalhes técnicos

- Novas tabelas: `subscriptions`, `payments`, `notifications`, `professional_services`, mais colunas em `salons`, `clients`, `professionals`. Todas com GRANTs e RLS por salão.
- Status do trial derivado no servidor (função SQL/`createServerFn`), nunca no cliente; o bloqueio é aplicado dentro de cada server function de escrita, além do bloqueio visual.
- Webhook do provedor de pagamento em `src/routes/api/public/*` com verificação de assinatura.
- Bucket de armazenamento público para logos/capas/fotos com políticas por salão.
- Notificações gravadas pelas próprias server functions de agendamento (incluindo o fluxo público).

## Ordem de execução

1. Banco: assinatura, pagamentos, notificações, campos extras, storage.
2. Trial + bloqueio + página de Assinatura (botão de checkout ainda inativo).
3. Ativar Stripe, criar o plano e ligar checkout + webhook.
4. Central de notificações.
5. Página pública personalizada e fluxo de agendamento em etapas.
6. Campos extras nas telas de clientes, profissionais e serviços.
