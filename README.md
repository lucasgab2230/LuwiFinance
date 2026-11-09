# Luwi — Inteligência Financeira Pessoal (Landing Page & PWA)

Aplicativo de finanças pessoais impulsionado por inteligência artificial (**Google Gemini 3.5 Flash Lite**), com landing page moderna de apresentação e alta conversão, back-end de autenticação em **Laravel + PostgreSQL** e suporte completo a **PWA (Progressive Web App)** com funcionamento offline para celulares (Android e iPhone).

---

## Estrutura da Experiência do Usuário

1. **🌟 Landing Page de Alta Conversão (Tela Inicial):**
   - **Hero Section:** Headline visual marcante (*"O fim das planilhas chatas. Apenas converse com a Luwi"*), botões de ação imediata e mockup interativo demonstrando a IA em ação.
   - **O Choque de Realidade:** Comparativo direto entre o método tradicional (planilhas cansativas e apps burocráticos) vs o método conversacional da Luwi.
   - **Os 3 Agentes de IA:** Apresentação detalhada do **Copiloto** (dia a dia), **Guardião** (auditoria de assinaturas) e **Estrategista** (planejamento de metas).
   - **Passo a Passo Rápido & FAQ:** Seção interativa respondendo dúvidas sobre gratuidade, privacidade, suporte offline e instalação móvel.
   - **Conversão Flexível:** Permite criar conta no PostgreSQL, fazer login ou acessar instantaneamente em modo visitante.

2. **📱 PWA Nativo nos Celulares (Android e iPhone):**
   - Barra de navegação inferior (*Bottom Navigation Bar*), tela cheia sem barras de navegador (*standalone*), suporte a *safe-area* e funcionamento 100% offline via Service Worker.

3. **💻 Aplicação Completa no Computador:**
   - Visual em painel amplo com barra lateral, extrato consolidado, feed de alertas e botão rápido para retornar à apresentação a qualquer momento.

4. **🐘 Back-end 100% Open-Source (Laravel 11 + PostgreSQL):**
   - Diretório [`backend/`](backend/) com suporte a tokens Bearer (Sanctum), criptografia de senhas e migrations para PostgreSQL.

---

## Como Executar

### 1. Iniciar o Front-end & Servidor de IA (Node.js)
```bash
npm start
```
Abra no navegador: **[http://localhost:3000](http://localhost:3000)**

- Você entrará diretamente na **Landing Page**.
- Para entrar no aplicativo financeiro, clique em **"Começar Gratuitamente"**, **"Entrar"** ou **"Ver Demonstração ao Vivo"**.
- Dentro do aplicativo, basta clicar em **"← Voltar à Apresentação"** na barra lateral para rever a landing page.

### 2. Iniciar o Back-end de Autenticação (Laravel + PostgreSQL)
```bash
cd backend
composer install
php artisan migrate
php artisan serve --port=8000
```

---

## Executar com Docker & Docker Compose

Para subir toda a infraestrutura com um único comando (Front-end + Back-end Laravel + Banco PostgreSQL):

```bash
docker compose up -d --build
```

- **Front-end & PWA:** `http://localhost:3000`
- **API Laravel:** `http://localhost:8000`
- **PostgreSQL:** `localhost:5432` (banco `luwifinance_db`)

---

## Deploy na Vercel (um projeto, múltiplos serviços)

O arquivo [`vercel.json`](vercel.json) na raiz define dois serviços dentro do mesmo projeto Vercel:

| Serviço | Raiz | Runtime | Exposição pública |
| :--- | :--- | :--- | :--- |
| `app` | `.` | `node` (`node server.js`, porta `PORT`/3000) | Servida em `/` e em `/api/chat` |
| `backend` | `backend` | `container` (Dockerfile Laravel, porta 8000) | Servida em `/api/*` (exceto `/api/chat`) |

Roteamento (rewrites, do mais específico para o catch-all):

1. `/api/chat` → `app` (o Node server atende o copiloto de IA e as estatísticas estáticas do PWA);
2. `/api/(.*)` → `backend` (Laravel: `/api/health`, `/api/register`, `/api/login`, `/api/me`, `/api/logout`);
3. `/(.*)` → `app` (PWA: landing page, assets, service worker).

Como o frontend e a API vivem no **mesmo domínio**, o código cliente chama `/api/*` (URLs relativas, ver `src/app.js`) — sem CORS e sem URLs hardcoded. Serviços Vercel são internos por padrão; só recebem tráfego público via rewrites no nível superior. Nenhum serviço chama outro em runtime (o navegador é quem chama a API), portanto **não há bindings** no `vercel.json`. Se um dia um serviço passar a chamar outro (ex.: o `app` fazer proxy para o `backend`), declare um binding no serviço chamador, ex.: `{ "type": "service", "service": "backend", "format": "url", "env": "BACKEND_URL" }`, e leia `process.env.BACKEND_URL` (bindings resolvem só em runtime, em functions — nunca no navegador).

### Variáveis de ambiente (painel do projeto Vercel)

**Serviço `app`** (raiz):
- `GEMINI_API_KEY` (obrigatória para `/api/chat`; sem ela a rota responde 503)
- `GEMINI_MODEL` (opcional, padrão `gemini-3.5-flash-lite`)
- `ALLOWED_ORIGIN` (opcional; deixe **vazio** para same-origin na Vercel — o servidor aceita apenas Origin cujo host seja igual ao Host da requisição. Defina explicitamente apenas se a API for chamada de outra origem)
- `NODE_ENV=production`

**Serviço `backend`** (`backend/`):
- `APP_KEY` (obrigatória — gere com `php artisan key:generate --show`)
- `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://<seu-domínio>`
- `DB_CONNECTION=pgsql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (ex.: Neon/Supabase — PostgreSQL gerenciado)
- `FRONTEND_URL=https://<seu-domínio>`, `SANCTUM_STATEFUL_DOMAINS=<seu-domínio>`
- `PORT` (opcional; o Dockerfile respeita `$PORT` e cai para 8000)

> Observação: o backend precisa ser alcançado a partir do navegador; por isso fica público em `/api/*`. Os endpoints de autenticação são públicos por definição (registro/login), mas usam senhas com hash e tokens Bearer (Sanctum). O banco PostgreSQL **não** é um serviço Vercel — provisione um PostgreSQL gerenciado e aponte as variáveis `DB_*`.

Teste localmente com `vercel dev` (sobe os dois serviços juntos e injeta as variáveis de binding, se houver).
