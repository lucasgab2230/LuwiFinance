import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const allowedOrigin = process.env.ALLOWED_ORIGIN || `http://localhost:${port}`;
const systemPrompt = `Você é Luwi, uma copiloto de inteligência financeira pessoal acolhedora, objetiva e inteligente. Sua proposta é simplificar as finanças eliminando a complexidade de planilhas e gráficos confusos, conversando em linguagem natural, clara e sem jargões.

Suas diretrizes:
1. Responda com clareza, empatia e objetividade em português do Brasil, usando valores em Reais (R$).
2. Use o contexto financeiro real fornecido sobre as finanças do usuário (saldo, receitas, despesas, transações recentes) para responder com precisão.
3. Se o usuário registrar uma movimentação através de linguagem natural (ex: "gastei 45 no almoço", "comprei remédio por 32 reais", "recebi 1200 de freelance", "paguei 55,90 da netflix"), confirme o registro em uma frase amigável e inclua no FINAL da sua resposta a tag de ação estruturada:
<!--ACTION:{"type":"ADD_TRANSACTION","name":"Descrição Curta","amount":45.00,"transactionType":"expense","category":"Alimentação"}-->
(Campos obrigatórios: name: string, amount: número positivo, transactionType: "expense" ou "income", category: "Alimentação"|"Moradia"|"Transporte"|"Lazer"|"Saúde"|"Assinaturas"|"Educação"|"Renda"|"Outros").
4. Aja como múltiplos agentes integrados: detecte assinaturas repetidas, analise tendências de gastos e sugira cortes práticos.
5. Nunca peça senhas ou dados bancários sensíveis e nunca garanta retorno financeiro ou promessas irreais de investimentos.`;
const buckets = new Map();
const MIME = { 
  ".html": "text/html; charset=utf-8", 
  ".js": "text/javascript; charset=utf-8", 
  ".css": "text/css; charset=utf-8", 
  ".json": "application/json; charset=utf-8", 
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function headers(contentType, origin = allowedOrigin) {
  return { 
    "Content-Type": contentType, 
    "Cache-Control": "no-store", 
    "X-Content-Type-Options": "nosniff", 
    "X-Frame-Options": "DENY", 
    "Referrer-Policy": "no-referrer", 
    "Service-Worker-Allowed": "/",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()", 
    "Content-Security-Policy": "default-src 'self'; connect-src 'self' http://localhost:8000 https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; worker-src 'self'; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", 
    "Strict-Transport-Security": process.env.NODE_ENV === "production" ? "max-age=31536000; includeSubDomains" : "max-age=0", 
    "Access-Control-Allow-Origin": origin 
  };
}
function send(res, code, body, type = "application/json; charset=utf-8") { res.writeHead(code, headers(type)); res.end(typeof body === "string" ? body : JSON.stringify(body)); }
function clientKey(req) { return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function allowed(req) { return !req.headers.origin || req.headers.origin === allowedOrigin; }
function rateLimited(req) { const key = clientKey(req), now = Date.now(), old = buckets.get(key) || []; const fresh = old.filter(t => now - t < 60_000); fresh.push(now); buckets.set(key, fresh); return fresh.length > 20; }
function readBody(req) { return new Promise((resolveBody, reject) => { let data = "", size = 0; req.on("data", chunk => { size += chunk.length; if (size > 12_000) { reject(new Error("payload too large")); req.destroy(); } else data += chunk; }); req.on("end", () => resolveBody(data)); req.on("error", reject); }); }
async function chat(req, res) {
  if (!allowed(req)) return send(res, 403, { error: "origin not allowed" });
  if (rateLimited(req)) return send(res, 429, { error: "too many requests" });
  if (!apiKey) return send(res, 503, { error: "AI provider is not configured" });
  let payload; try { payload = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: "invalid JSON" }); }
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message || message.length > 2_000) return send(res, 400, { error: "message must contain 1-2000 characters" });
  
  const financialContext = payload.context && typeof payload.context === "object" ? payload.context : null;
  const userContent = financialContext 
    ? `[DADOS FINANCEIROS ATUAIS DO USUÁRIO]:\n${JSON.stringify(financialContext, null, 2)}\n\n[MENSAGEM DO USUÁRIO]:\n${message}`
    : message;

  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userContent }] }] }) });
  if (!upstream.ok) return send(res, 502, { error: "AI provider request failed" });
  const data = await upstream.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof answer !== "string") return send(res, 502, { error: "AI provider returned no answer" });
  return send(res, 200, { answer });
}
async function serve(req, res) {
  if (req.method === "POST" && req.url === "/api/chat") return chat(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "method not allowed" });
  let requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = normalize(join(root, requested));
  if (!file.startsWith(root) || file.includes("..")) return send(res, 404, { error: "not found" });
  try { const data = await readFile(file); res.writeHead(200, headers(MIME[extname(file)] || "application/octet-stream")); if (req.method !== "HEAD") res.end(data); else res.end(); } catch { send(res, 404, { error: "not found" }); }
}
createServer((req, res) => serve(req, res).catch(() => send(res, 500, { error: "internal server error" }))).listen(port, () => console.log(`LuwiFinance running on http://localhost:${port}`));
