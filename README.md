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
   - Diretório [`backend/`](file:///c:/Users/lucas/Documents/Codex/LuwiFinance-OrganizationApp/backend) com suporte a tokens Bearer (Sanctum), criptografia de senhas e migrations para PostgreSQL.

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
