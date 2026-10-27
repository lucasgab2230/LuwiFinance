/**
 * Luwi — Inteligência Financeira Pessoal (Inspirado no Pierre)
 * 100% Vanilla JavaScript, Ultra-Leve e com Persistência em LocalStorage
 */

// ============================================================================
// 1. ESTADO DA APLICAÇÃO & PERSISTÊNCIA
// ============================================================================
const STORAGE_KEYS = {
  TRANSACTIONS: 'luwi_transactions_v2',
  GOALS: 'luwi_goals_v2',
  CHAT_MESSAGES: 'luwi_chat_messages_v2',
  SETTINGS: 'luwi_settings_v2',
  AUTH_TOKEN: 'luwi_auth_token',
  AUTH_USER: 'luwi_auth_user'
};

const LARAVEL_API_URL = 'http://localhost:8000/api';

const DEFAULT_TRANSACTIONS = [
  { id: '1', name: 'Salário Mensal', amount: 5200.00, type: 'income', category: 'Renda', isRecurring: true, date: '01/10/2026' },
  { id: '2', name: 'Aluguel do Apê', amount: 1450.00, type: 'expense', category: 'Moradia', isRecurring: true, date: '05/10/2026' },
  { id: '3', name: 'Supermercado Central', amount: 487.45, type: 'expense', category: 'Alimentação', isRecurring: false, date: '12/10/2026' },
  { id: '4', name: 'Netflix Premium', amount: 55.90, type: 'expense', category: 'Assinaturas', isRecurring: true, date: '15/10/2026' },
  { id: '5', name: 'Spotify Individual', amount: 21.90, type: 'expense', category: 'Assinaturas', isRecurring: true, date: '18/10/2026' },
  { id: '6', name: 'Farmácia Saúde', amount: 84.30, type: 'expense', category: 'Saúde', isRecurring: false, date: '22/10/2026' },
  { id: '7', name: 'Uber para Reunião', amount: 32.50, type: 'expense', category: 'Transporte', isRecurring: false, date: 'Ontem' },
];

const DEFAULT_GOALS = [
  { id: 'g1', title: 'Reserva de Emergência (6 meses)', target: 12000.00, current: 7500.00 },
  { id: 'g2', title: 'Viagem de Fim de Ano', target: 3500.00, current: 2200.00 }
];

const state = {
  transactions: loadData(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS),
  goals: loadData(STORAGE_KEYS.GOALS, DEFAULT_GOALS),
  chatHistory: loadData(STORAGE_KEYS.CHAT_MESSAGES, []),
  currentAgent: 'copilot',
  balanceVisible: true,
  txFilter: 'all',
  user: loadData(STORAGE_KEYS.AUTH_USER, null),
  token: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null,
  backendOnline: false
};

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

// ============================================================================
// 2. UTILITÁRIOS E FORMATAÇÃO
// ============================================================================
const formatMoney = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const escapeHtml = (str) => {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

function getCategoryIcon(cat) {
  const map = {
    'Alimentação': '🍔',
    'Moradia': '🏠',
    'Transporte': '🚗',
    'Lazer': '🍿',
    'Saúde': '💊',
    'Assinaturas': '🔄',
    'Educação': '📚',
    'Renda': '💰',
    'Outros': '🏷️'
  };
  return map[cat] || '💳';
}

function showToast(text, icon = '✦') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(text)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================================
// 3. RENDERIZAÇÃO E CÁLCULOS FINANCEIROS
// ============================================================================
function calculateFinancials() {
  let income = 0;
  let expense = 0;
  let subsTotal = 0;
  const categories = {};

  state.transactions.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      income += amt;
    } else {
      expense += amt;
      categories[t.category] = (categories[t.category] || 0) + amt;
      if (t.isRecurring || t.category === 'Assinaturas') {
        subsTotal += amt;
      }
    }
  });

  const balance = income - expense;
  return { income, expense, balance, subsTotal, categories };
}

function renderAll() {
  const stats = calculateFinancials();

  // 1. Atualizar cards de Saldo e Totais
  const totalBalanceEl = document.getElementById('totalBalanceDisplay');
  const totalIncomeEl = document.getElementById('totalIncomeDisplay');
  const totalExpenseEl = document.getElementById('totalExpenseDisplay');

  if (state.balanceVisible) {
    totalBalanceEl.textContent = formatMoney(stats.balance);
    totalIncomeEl.textContent = formatMoney(stats.income);
    totalExpenseEl.textContent = formatMoney(stats.expense);
  } else {
    totalBalanceEl.textContent = 'R$ ••••••';
    totalIncomeEl.textContent = 'R$ ••••••';
    totalExpenseEl.textContent = 'R$ ••••••';
  }

  document.getElementById('navTxCount').textContent = state.transactions.length;
  document.getElementById('subsTotalDisplay').textContent = `${formatMoney(stats.subsTotal)}/mês`;

  // 2. Renderizar Alertas Inteligentes (Inspirado no Pierre)
  renderSmartAlerts(stats);

  // 3. Renderizar Transações Recentes no Dashboard
  renderDashboardTransactions();

  // 4. Renderizar Categorias no Dashboard
  renderCategoryBreakdown(stats);

  // 5. Renderizar Extrato Completo
  renderAllTransactions();

  // 6. Renderizar Assinaturas
  renderSubscriptions();

  // 7. Renderizar Metas
  renderGoals();
}

function renderSmartAlerts(stats) {
  const deck = document.getElementById('alertsDeck');
  const alerts = [];

  // Alerta de Assinaturas
  const recurringCount = state.transactions.filter(t => t.isRecurring || t.category === 'Assinaturas').length;
  if (recurringCount > 0) {
    alerts.push({
      type: 'sub',
      icon: '🔄',
      title: `${recurringCount} assinaturas ativas monitoradas`,
      desc: `Total de ${formatMoney(stats.subsTotal)} por mês. A Luwi ajuda a identificar cobranças esquecidas.`
    });
  }

  // Alerta de Categoria dominante
  const sortedCats = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0 && stats.expense > 0) {
    const [topCat, topVal] = sortedCats[0];
    const pct = Math.round((topVal / stats.expense) * 100);
    if (pct >= 30) {
      alerts.push({
        type: 'warn',
        icon: '⚡',
        title: `${topCat} concentra ${pct}% das suas despesas`,
        desc: `Você já destinou ${formatMoney(topVal)} para essa categoria neste período.`
      });
    }
  }

  // Insight de Projeção
  if (stats.balance > 0) {
    alerts.push({
      type: 'tip',
      icon: '✨',
      title: 'Saldo saudável e positivo',
      desc: `Suas receitas superam as despesas em ${formatMoney(stats.balance)}. Excelente momento para investir ou alimentar suas metas!`
    });
  } else if (stats.expense > stats.income) {
    alerts.push({
      type: 'warn',
      icon: '⚠️',
      title: 'Atenção aos limites do mês',
      desc: 'Suas saídas ultrapassaram as entradas registradas. Pergunte à Luwi onde cortar despesas supérfluas.'
    });
  }

  deck.innerHTML = alerts.map(a => `
    <div class="alert-card">
      <div class="alert-icon-box ${a.type}">${a.icon}</div>
      <div class="alert-content">
        <h4>${escapeHtml(a.title)}</h4>
        <p>${escapeHtml(a.desc)}</p>
      </div>
    </div>
  `).join('');
}

function renderDashboardTransactions() {
  const container = document.getElementById('dashboardRecentList');
  const recents = state.transactions.slice(0, 5);

  if (recents.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:16px 0; font-size:12px;">Nenhuma movimentação ainda. Use a barra acima para falar com a Luwi!</p>`;
    return;
  }

  container.innerHTML = recents.map(t => createTxRowHtml(t)).join('');
}

function renderAllTransactions() {
  const container = document.getElementById('allTransactionsList');
  let filtered = [...state.transactions];

  if (state.txFilter === 'expense') filtered = filtered.filter(t => t.type === 'expense');
  else if (state.txFilter === 'income') filtered = filtered.filter(t => t.type === 'income');
  else if (state.txFilter === 'subscription') filtered = filtered.filter(t => t.isRecurring || t.category === 'Assinaturas');

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:24px 0; text-align:center;">Nenhuma movimentação encontrada neste filtro.</p>`;
    return;
  }

  container.innerHTML = filtered.map(t => createTxRowHtml(t, true)).join('');
}

function createTxRowHtml(t, canDelete = false) {
  const isIncome = t.type === 'income';
  const sign = isIncome ? '+' : '-';
  const amtClass = isIncome ? 'income' : 'expense';
  const icon = getCategoryIcon(t.category);

  return `
    <div class="tx-row" data-id="${t.id}">
      <div class="tx-icon-bubble">${icon}</div>
      <div class="tx-info">
        <div class="tx-title">
          <span>${escapeHtml(t.name)}</span>
          ${t.isRecurring ? '<span class="tx-badge-rec">Recorrente</span>' : ''}
        </div>
        <div class="tx-meta">
          <span>${escapeHtml(t.category || 'Geral')}</span>
          <span>•</span>
          <span>${escapeHtml(t.date || 'Hoje')}</span>
        </div>
      </div>
      <div class="tx-amount ${amtClass}">${sign} ${formatMoney(t.amount)}</div>
      ${canDelete ? `<button class="tx-btn-delete" onclick="deleteTransaction('${t.id}')" title="Excluir">✕</button>` : ''}
    </div>
  `;
}

function renderCategoryBreakdown(stats) {
  const container = document.getElementById('categoriesBreakdown');
  const entries = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0 || stats.expense === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:12px;">Nenhuma despesa para classificar.</p>`;
    return;
  }

  container.innerHTML = entries.slice(0, 4).map(([cat, val]) => {
    const pct = Math.round((val / stats.expense) * 100);
    return `
      <div class="cat-item">
        <div class="cat-head">
          <span>${getCategoryIcon(cat)} ${escapeHtml(cat)}</span>
          <strong>${formatMoney(val)} (${pct}%)</strong>
        </div>
        <div class="cat-bar">
          <div class="cat-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSubscriptions() {
  const grid = document.getElementById('subscriptionsGrid');
  const subs = state.transactions.filter(t => t.isRecurring || t.category === 'Assinaturas');

  if (subs.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted); grid-column:span 3; padding:20px 0;">Nenhuma assinatura detectada ainda. Adicione uma ou marque como recorrente!</p>`;
    return;
  }

  grid.innerHTML = subs.map(s => `
    <div class="sub-card">
      <div class="tx-icon-bubble">${getCategoryIcon(s.category)}</div>
      <div>
        <strong>${escapeHtml(s.name)}</strong>
        <small>${escapeHtml(s.category)} • Mensal</small>
      </div>
      <div class="sub-price">${formatMoney(s.amount)}</div>
    </div>
  `).join('');
}

function renderGoals() {
  const grid = document.getElementById('goalsGrid');

  if (state.goals.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted); grid-column:span 2;">Nenhuma meta cadastrada ainda. Crie uma para a Luwi acompanhar!</p>`;
    return;
  }

  grid.innerHTML = state.goals.map(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    return `
      <div class="goal-box">
        <div class="goal-box-head">
          <h4>${escapeHtml(g.title)}</h4>
          <span class="goal-pct">${pct}%</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="goal-meta-row">
          <span>Acumulado: ${formatMoney(g.current)}</span>
          <span>Alvo: ${formatMoney(g.target)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// 4. INTEGRAÇÃO COM A IA CONVERSACIONAL (COPILOTO LUWI)
// ============================================================================
async function sendToLuwi(userMessage) {
  if (!userMessage || !userMessage.trim()) return;
  const cleanMsg = userMessage.trim();

  // 1. Renderizar mensagem do usuário no chat
  appendChatMessage('user', cleanMsg);

  // 2. Montar contexto financeiro em tempo real para o Gemini 3.5 Flash Lite
  const financials = calculateFinancials();
  const context = {
    saldoDisponivel: financials.balance,
    totalReceitas: financials.income,
    totalDespesas: financials.expense,
    despesasPorCategoria: financials.categories,
    totalAssinaturasMensais: financials.subsTotal,
    ultimasTransacoes: state.transactions.slice(0, 8).map(t => ({
      nome: t.name,
      valor: t.amount,
      tipo: t.type,
      categoria: t.category,
      recorrente: t.isRecurring
    })),
    metas: state.goals.map(g => ({
      meta: g.title,
      alvo: g.target,
      guardado: g.current
    })),
    agenteSelecionado: state.currentAgent
  };

  // 3. Efeito de carregamento
  const loadingMsgId = appendChatMessage('ai', 'Pensando...', true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: cleanMsg,
        context: context
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na comunicação com a Luwi');

    let answer = data.answer || '';

    // 4. Processar ações da IA (ex: registro automático de transações)
    const actionMatch = answer.match(/<!--ACTION:(.*?)-->/);
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        if (actionData.type === 'ADD_TRANSACTION') {
          const newTx = {
            id: String(Date.now()),
            name: actionData.name || 'Nova Movimentação',
            amount: Math.abs(Number(actionData.amount) || 0),
            type: actionData.transactionType || 'expense',
            category: actionData.category || 'Outros',
            isRecurring: actionData.category === 'Assinaturas',
            date: 'Agora (via IA)'
          };

          state.transactions.unshift(newTx);
          saveData(STORAGE_KEYS.TRANSACTIONS, state.transactions);
          renderAll();
          showToast(`Lançamento de ${formatMoney(newTx.amount)} registrado!`, '✦');
        }
      } catch (err) {
        console.error('Erro ao interpretar ação da IA:', err);
      }
      // Remove a tag interna antes de exibir
      answer = answer.replace(/<!--ACTION:.*?-->/g, '').trim();
    }

    updateChatMessage(loadingMsgId, answer);

  } catch (err) {
    updateChatMessage(loadingMsgId, 'A Luwi está momentaneamente desconectada. Verifique se o servidor está ativo.');
  }
}

function appendChatMessage(sender, text, isLoading = false) {
  const thread = document.getElementById('chatThread');
  const msgEl = document.createElement('div');
  const msgId = 'msg_' + Date.now();
  msgEl.id = msgId;
  msgEl.className = `chat-msg ${sender}`;

  const avatar = sender === 'ai' ? '✦' : 'EU';
  msgEl.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">
      <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
      <small class="msg-time">${isLoading ? 'Digitando...' : 'Agora'}</small>
    </div>
  `;

  thread.appendChild(msgEl);
  msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return msgId;
}

function updateChatMessage(msgId, newText) {
  const el = document.getElementById(msgId);
  if (!el) return;
  const bubble = el.querySelector('.msg-bubble');
  bubble.innerHTML = `
    <p>${escapeHtml(newText).replace(/\n/g, '<br>')}</p>
    <small class="msg-time">Agora</small>
  `;
}

// ============================================================================
// 4.5 INTEGRAÇÃO COM BACKEND LARAVEL + POSTGRESQL (AUTENTICAÇÃO)
// ============================================================================
async function checkBackendHealth() {
  const pill = document.getElementById('backendStatusPill');
  const dot = pill.querySelector('.status-dot');
  const text = document.getElementById('backendStatusText');

  try {
    const res = await fetch(`${LARAVEL_API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      state.backendOnline = true;
      dot.className = 'status-dot online';
      text.textContent = 'Laravel + PostgreSQL: Online';
      return true;
    }
  } catch {
    // Backend offline / não iniciado
  }

  state.backendOnline = false;
  dot.className = 'status-dot warning';
  text.textContent = 'Laravel Auth: Modo Local';
  return false;
}

function updateUserUI() {
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const triggerBtn = document.getElementById('btnAuthTrigger');

  if (state.user && state.user.name) {
    const initials = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
    nameEl.textContent = state.user.name;
    emailEl.textContent = state.user.email || 'Conta Autenticada';
    triggerBtn.textContent = '🚪';
    triggerBtn.title = 'Encerrar Sessão (Logout)';
  } else {
    avatarEl.textContent = '?';
    nameEl.textContent = 'Visitante';
    emailEl.textContent = 'Modo Local';
    triggerBtn.textContent = '🔑';
    triggerBtn.title = 'Entrar ou Criar Conta';
  }
}

async function loginUser(email, password) {
  if (!state.backendOnline) {
    // Fallback: Login demonstrativo local caso o Laravel ainda não esteja rodando
    state.user = { name: email.split('@')[0], email: email };
    state.token = 'local_demo_token';
    saveData(STORAGE_KEYS.AUTH_USER, state.user);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, state.token);
    updateUserUI();
    showToast(`Bem-vindo, ${state.user.name}! (Modo Local)`, '👋');
    return true;
  }

  const res = await fetch(`${LARAVEL_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao realizar login.');

  state.user = data.user;
  state.token = data.token;
  saveData(STORAGE_KEYS.AUTH_USER, state.user);
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, state.token);
  updateUserUI();
  showToast(`Login confirmado no PostgreSQL! Olá, ${state.user.name}`, '✓');
  return true;
}

async function registerUser(name, email, password) {
  if (!state.backendOnline) {
    // Fallback local se o backend Laravel estiver offline
    state.user = { name: name, email: email };
    state.token = 'local_demo_token';
    saveData(STORAGE_KEYS.AUTH_USER, state.user);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, state.token);
    updateUserUI();
    showToast(`Conta criada localmente! Olá, ${name}`, '✓');
    return true;
  }

  const res = await fetch(`${LARAVEL_API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao cadastrar.');

  state.user = data.user;
  state.token = data.token;
  saveData(STORAGE_KEYS.AUTH_USER, state.user);
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, state.token);
  updateUserUI();
  showToast('Usuário salvo no PostgreSQL com sucesso!', '✦');
  return true;
}

async function logoutUser() {
  if (state.backendOnline && state.token && state.token !== 'local_demo_token') {
    try {
      await fetch(`${LARAVEL_API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });
    } catch {
      // Falha silenciosa de rede no logout
    }
  }

  state.user = null;
  state.token = null;
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  updateUserUI();
  showToast('Você saiu da sua conta.', '👋');
}

// ============================================================================
// 4.6 TRANSIÇÃO ENTRE LANDING PAGE E APLICAÇÃO FINANCEIRA
// ============================================================================
function showLanding() {
  const landing = document.getElementById('landingScreen');
  const app = document.getElementById('appScreen');
  if (landing) landing.style.display = 'block';
  if (app) app.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showApp() {
  const landing = document.getElementById('landingScreen');
  const app = document.getElementById('appScreen');
  if (landing) landing.style.display = 'none';
  if (app) app.style.display = 'block';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// 5. INTERAÇÃO E EVENT LISTENERS
// ============================================================================
function navigateTo(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  const target = document.getElementById(`${viewName}View`);
  if (target) target.classList.add('active-view');

  document.querySelectorAll('.nav-btn, .bottom-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });

  const titles = {
    dashboard: 'Seu dinheiro em perspectiva',
    chat: 'Copiloto Luwi — Converse com sua IA',
    transactions: 'Histórico & Extrato',
    subscriptions: 'Assinaturas & Cobranças',
    goals: 'Objetivos e Reservas'
  };
  document.getElementById('viewTitle').textContent = titles[viewName] || 'LuwiFinance';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Ações globais
window.deleteTransaction = function(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveData(STORAGE_KEYS.TRANSACTIONS, state.transactions);
  renderAll();
  showToast('Movimentação removida.', '🗑️');
};

document.addEventListener('DOMContentLoaded', () => {
  // Data de hoje no topo
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('currentDateLabel').textContent = dateStr.toUpperCase();

  // Navegação
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // Botão Falar com a Luwi no topo
  document.getElementById('openChatQuick').addEventListener('click', () => {
    navigateTo('chat');
    document.getElementById('chatComposerInput').focus();
  });

  // Ocultar / Mostrar Saldo
  document.getElementById('toggleBalanceVisibility').addEventListener('click', () => {
    state.balanceVisible = !state.balanceVisible;
    renderAll();
  });

  // Barra de entrada rápida estilo Pierre no topo
  const quickInput = document.getElementById('quickNaturalInput');
  const btnSendNatural = document.getElementById('btnSendNatural');

  function handleQuickSend() {
    const val = quickInput.value.trim();
    if (!val) return;
    quickInput.value = '';
    navigateTo('chat');
    sendToLuwi(val);
  }

  btnSendNatural.addEventListener('click', handleQuickSend);
  quickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleQuickSend();
  });

  // Chat Composer
  const chatForm = document.getElementById('chatComposer');
  const chatInput = document.getElementById('chatComposerInput');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = chatInput.value.trim();
    if (!val) return;
    chatInput.value = '';
    sendToLuwi(val);
  });

  // Sugestões de Chips
  document.querySelectorAll('.prompt-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt) sendToLuwi(prompt);
    });
  });

  // Seletor de Agentes
  document.querySelectorAll('.agent-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.agent-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentAgent = tab.dataset.agent;

      const greetings = {
        copilot: 'Modo Copiloto ativo: tire dúvidas sobre seus gastos e registre despesas.',
        guardian: 'Modo Guardião ativo: vou auditar suas assinaturas, padrões fora do comum e despesas recorrentes.',
        strategist: 'Modo Estrategista ativo: vamos planejar o fechamento do mês e suas metas de economia.'
      };
      appendChatMessage('ai', greetings[state.currentAgent]);
    });
  });

  // Filtros de Extrato
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.txFilter = btn.dataset.filter;
      renderAllTransactions();
    });
  });

  // Modais
  const txModal = document.getElementById('txModal');
  const openAddModal = document.getElementById('openAddModal');
  const closeTxModal = document.getElementById('closeTxModal');
  const txForm = document.getElementById('txForm');

  openAddModal.addEventListener('click', () => txModal.classList.add('open'));
  closeTxModal.addEventListener('click', () => txModal.classList.remove('open'));

  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(txForm);
    const newTx = {
      id: String(Date.now()),
      name: formData.get('description'),
      amount: Number(formData.get('amount')),
      type: formData.get('type'),
      category: formData.get('category'),
      isRecurring: formData.get('isRecurring') === 'on',
      date: 'Hoje'
    };

    state.transactions.unshift(newTx);
    saveData(STORAGE_KEYS.TRANSACTIONS, state.transactions);
    renderAll();
    txForm.reset();
    txModal.classList.remove('open');
    showToast('Lançamento salvo com sucesso!', '✓');
  });

  // Modal de Metas
  const goalModal = document.getElementById('goalModal');
  const btnNewGoalModal = document.getElementById('btnNewGoalModal');
  const closeGoalModal = document.getElementById('closeGoalModal');
  const goalForm = document.getElementById('goalForm');

  btnNewGoalModal.addEventListener('click', () => goalModal.classList.add('open'));
  closeGoalModal.addEventListener('click', () => goalModal.classList.remove('open'));

  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(goalForm);
    const newGoal = {
      id: 'g_' + Date.now(),
      title: formData.get('title'),
      target: Number(formData.get('target')),
      current: Number(formData.get('current'))
    };

    state.goals.push(newGoal);
    saveData(STORAGE_KEYS.GOALS, state.goals);
    renderAll();
    goalForm.reset();
    goalModal.classList.remove('open');
    showToast('Nova meta estabelecida!', '🎯');
  });

  // Modal de Autenticação (Laravel + PostgreSQL)
  const authModal = document.getElementById('authModal');
  const btnAuthTrigger = document.getElementById('btnAuthTrigger');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  btnAuthTrigger.addEventListener('click', () => {
    if (state.user) {
      // Se já está logado, botão serve para logout
      if (confirm(`Deseja encerrar a sessão de ${state.user.name}?`)) {
        logoutUser();
      }
    } else {
      authModal.classList.add('open');
    }
  });

  closeAuthModal.addEventListener('click', () => authModal.classList.remove('open'));

  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    const btn = document.getElementById('btnLoginSubmit');

    btn.disabled = true;
    btn.textContent = 'Verificando...';
    try {
      await loginUser(email, pass);
      authModal.classList.remove('open');
      loginForm.reset();
      showApp();
    } catch (err) {
      alert(err.message || 'Falha ao autenticar.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar na Conta';
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;
    const btn = document.getElementById('btnRegisterSubmit');

    btn.disabled = true;
    btn.textContent = 'Cadastrando no PostgreSQL...';
    try {
      await registerUser(name, email, pass);
      authModal.classList.remove('open');
      registerForm.reset();
      showApp();
    } catch (err) {
      alert(err.message || 'Falha ao registrar.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Cadastrar no PostgreSQL';
    }
  });

  // Acesso direto sem conta (Modo Convidado)
  const btnGuestAccess = document.getElementById('btnGuestAccess');
  if (btnGuestAccess) {
    btnGuestAccess.addEventListener('click', () => {
      authModal.classList.remove('open');
      showApp();
      showToast('Acesso como Visitante. Seus dados estão salvos neste aparelho!', '👋');
    });
  }

  // Fechar modais ao clicar no backdrop
  window.addEventListener('click', (e) => {
    if (e.target === txModal) txModal.classList.remove('open');
    if (e.target === goalModal) goalModal.classList.remove('open');
    if (e.target === authModal) authModal.classList.remove('open');
  });

  // Checagem de backend e status de usuário
  updateUserUI();
  checkBackendHealth();

  // Suporte a cliques na Bottom Navigation Bar (Celular)
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // Notificações de Conectividade (Offline / Online)
  window.addEventListener('online', () => {
    showToast('Conexão restabelecida! Sincronizando com a nuvem...', '📶');
    checkBackendHealth();
  });

  window.addEventListener('offline', () => {
    showToast('Você está offline. O Luwi continua funcionando no modo local.', '📡');
  });

  // ============================================================================
  // GERENCIAMENTO DO PWA PARA CELULAR (ANDROID & IPHONE)
  // ============================================================================
  const mobileBanner = document.getElementById('mobileInstallBanner');
  const btnInstall = document.getElementById('btnInstallPwa');
  const btnDismiss = document.getElementById('btnDismissBanner');
  const bannerHint = document.getElementById('bannerInstallHint');
  let deferredPrompt = null;

  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isDismissed = sessionStorage.getItem('luwi_pwa_dismissed') === 'true';

  // Registra o Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registrado com escopo:', reg.scope))
      .catch((err) => console.log('[PWA] Falha ao registrar Service Worker:', err));
  }

  // Se for celular e não estiver no app instalado, oferece a instalação
  if (isMobile && !isStandalone && !isDismissed) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // Instruções personalizadas para iPhone / Safari
      bannerHint.textContent = "Toque em Compartilhar (⎋) e 'Adicionar à Tela de Início'";
      btnInstall.textContent = "Entendido";
      btnInstall.addEventListener('click', () => {
        alert("Para instalar no seu iPhone:\n1. Toque no botão de Compartilhar (ícone com quadrado e seta pra cima na barra do Safari)\n2. Role a lista e toque em 'Adicionar à Tela de Início'\n3. Pronto! O Luwi aparecerá como um app nativo no seu iPhone.");
      });
      mobileBanner.classList.add('show');
    } else {
      // Android / Chrome: Captura o evento nativo de instalação
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        mobileBanner.classList.add('show');
      });

      btnInstall.addEventListener('click', async () => {
        if (!deferredPrompt) {
          alert('Para instalar, abra o menu do seu navegador (⋮) e toque em "Instalar aplicativo" ou "Adicionar à tela inicial".');
          return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Aplicativo instalado no celular com sucesso!', '📱');
          mobileBanner.classList.remove('show');
        }
        deferredPrompt = null;
      });
    }

    btnDismiss.addEventListener('click', () => {
      mobileBanner.classList.remove('show');
      sessionStorage.setItem('luwi_pwa_dismissed', 'true');
    });
  }

  // Eventos da Landing Page
  const landingNavLoginBtn = document.getElementById('landingNavLoginBtn');
  const landingNavRegisterBtn = document.getElementById('landingNavRegisterBtn');
  const landingHeroCta = document.getElementById('landingHeroCta');
  const landingFooterCta = document.getElementById('landingFooterCta');
  const landingDemoCta = document.getElementById('landingDemoCta');
  const btnBackToLanding = document.getElementById('btnBackToLanding');

  if (landingNavLoginBtn) {
    landingNavLoginBtn.addEventListener('click', () => {
      tabLoginBtn.click();
      authModal.classList.add('open');
    });
  }

  const openRegisterModal = () => {
    tabRegisterBtn.click();
    authModal.classList.add('open');
  };

  if (landingNavRegisterBtn) landingNavRegisterBtn.addEventListener('click', openRegisterModal);
  if (landingHeroCta) landingHeroCta.addEventListener('click', openRegisterModal);
  if (landingFooterCta) landingFooterCta.addEventListener('click', openRegisterModal);

  if (landingDemoCta) {
    landingDemoCta.addEventListener('click', () => {
      showApp();
      showToast('Bem-vindo à Luwi! Experimente registrar um gasto no topo.', '✦');
    });
  }

  if (btnBackToLanding) {
    btnBackToLanding.addEventListener('click', () => {
      showLanding();
    });
  }

  // Roteamento inicial: Se for PWA instalado ou tiver ?app=true na URL, abre o app direto.
  // Senão, apresenta a Landing Page para converter o usuário!
  const urlParams = new URLSearchParams(window.location.search);
  const shouldOpenAppDirectly = urlParams.get('app') === 'true' || 
                                urlParams.get('source') === 'pwa' || 
                                window.location.hash === '#app' ||
                                (isMobile && isStandalone);

  if (shouldOpenAppDirectly) {
    showApp();
  } else {
    showLanding();
  }

  // Render inicial
  renderAll();
});
