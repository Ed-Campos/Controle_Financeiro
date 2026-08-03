# Controle e Gestão Financeira

App de gestão financeira para casais: receitas, despesas, metas, reserva de
emergência, simulador de cenários, calendário de contas e análise financeira
automática por regras.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Sem nenhuma configuração adicional, o app já
funciona sozinho — os dados ficam salvos no `localStorage` do navegador.

⚠️ **Nesse modo sem configuração, os dados NÃO sincronizam entre você e seu
parceiro(a)** — cada um veria seus próprios dados, presos ao próprio
navegador. Para a sincronização real de casal funcionar, siga o passo a
passo abaixo (leva uns 5 minutos, é grátis).

## Configurando o banco de dados real (Supabase)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo projeto.
2. No painel do projeto, vá em **SQL Editor** e rode:

   ```sql
   create table if not exists kv_store (
     key text primary key,
     value text not null,
     updated_at timestamptz default now()
   );

   alter table kv_store enable row level security;

   create policy "allow all"
     on kv_store for all
     using (true)
     with check (true);
   ```

   > Nota sobre segurança: essa política deixa a tabela aberta para leitura/escrita
   > por qualquer pessoa que tenha a URL e a chave anônima do seu projeto — o que é
   > aceitável aqui porque o "segredo" real do app é o código de 6 caracteres do
   > ambiente familiar (como uma senha de convite), não uma autenticação de usuário
   > de verdade. Se quiser mais segurança, dá para evoluir depois para o Supabase
   > Auth + políticas por usuário.

3. Em **Project Settings > API Keys**, copie a **Project URL**. Para a chave,
   pegue a **Publishable key** (formato `sb_publishable_...`) — é o nome atual
   que a Supabase está usando. Se seu projeto ainda mostrar só a **anon key**
   (formato antigo, um JWT longo), pode usar ela também — funciona igual.
4. Copie `.env.example` para `.env` e preencha:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

5. Reinicie `npm run dev`. O aviso amarelo na tela de login deve sumir — a
   partir daí, os dados sincronizam de verdade entre os dois parceiros, em
   qualquer dispositivo.

## Instalando como app no celular (PWA)

O projeto já vem pronto para ser instalado como aplicativo, com ícone próprio
e abrindo em tela cheia (sem barra do navegador):

- **Android (Chrome):** abra o link, toque no menu (⋮) → **"Adicionar à tela
  inicial"** ou **"Instalar app"**.
- **iPhone (Safari):** abra o link, toque no ícone de compartilhar → **"Adicionar
  à Tela de Início"**. (No iPhone precisa ser pelo Safari — o Chrome no iOS não
  permite instalar PWAs.)

Depois de instalado, o ícone fica na tela inicial igual a qualquer outro app.

## Deploy no Vercel

1. Suba este projeto para um repositório no GitHub (ou use `vercel --prod`
   direto pela CLI, dentro desta pasta).
2. No [vercel.com](https://vercel.com), importe o repositório. O Vercel
   detecta automaticamente que é um projeto Vite — não precisa mexer em
   build command nem output directory.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` com os mesmos valores do seu `.env`.
4. Deploy. Pronto — o link gerado já pode ser usado pelos dois.

## Estrutura

```
src/
  App.jsx          # todo o app (telas, cálculos, lógica de negócio)
  lib/storage.js    # camada de dados: Supabase quando configurado, localStorage como fallback
  main.jsx
  index.css
```

## Limitações conhecidas

- Não há autenticação com senha — entrar num ambiente familiar depende só de
  saber o código de 6 caracteres gerado na criação. Trate esse código como
  uma senha compartilhada.
- A "análise inteligente" é baseada em regras determinísticas sobre os
  dados cadastrados, não em um modelo de IA generativa.
- Sincronização entre os dois parceiros acontece por polling (a cada ~6s),
  não é instantânea via websockets.
