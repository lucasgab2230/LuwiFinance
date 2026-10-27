# LuwiFinance — Serviço de Autenticação (Laravel + PostgreSQL)

Serviço de autenticação e gerenciamento de identidade **100% Open Source (Licença MIT)** construído com **PHP 8.2+**, **Laravel 11**, **Laravel Sanctum** e banco de dados relacional **PostgreSQL**.

---

## Recursos da API

- **Criptografia Segura:** Senhas criptografadas nativamente com Bcrypt/Argon2.
- **Autenticação Stateless:** Tokens Bearer seguros gerenciados pelo Laravel Sanctum.
- **PostgreSQL Nativo:** Migrations completas para tabela de usuários, sessões e tokens de acesso pessoal com índices otimizados.
- **CORS Configurado:** Pronto para conectar com o frontend da Luwi em `http://localhost:3000`.

---

## Endpoints Disponíveis

| Método | Endpoint | Protegido? | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Não | Status de saúde do serviço |
| `POST` | `/api/register` | Não | Cadastra usuário no PostgreSQL e retorna token Bearer |
| `POST` | `/api/login` | Não | Valida credenciais e gera novo token |
| `GET` | `/api/me` | **Sim** (`Bearer <token>`) | Retorna os dados do usuário autenticado |
| `POST` | `/api/logout` | **Sim** (`Bearer <token>`) | Revoga e deleta o token atual |

---

## Como Executar

### 1. Requisitos
- PHP 8.2 ou superior com extensões `pdo_pgsql`, `mbstring`, `openssl`.
- Composer.
- Banco de dados PostgreSQL (local ou em nuvem).

> **Dica para computadores modestos (ex: Pentium / 4GB RAM):**  
> Em vez de instalar o servidor PostgreSQL localmente no Windows (que consome muita memória RAM em segundo plano), utilize um banco PostgreSQL gratuito na nuvem como **[Neon.tech](https://neon.tech)** ou **[Supabase](https://supabase.com)**. Eles oferecem PostgreSQL gratuito de alta performance sem gastar 1 MB da memória do seu PC!

### 2. Configuração do `.env`
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```
Defina as credenciais do seu PostgreSQL no `.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=seu_host_ou_127.0.0.1
DB_PORT=5432
DB_DATABASE=luwifinance_db
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha
```

### 3. Instalar Dependências e Rodar Migrations
```bash
composer install
php artisan key:generate
php artisan migrate
```

### 4. Iniciar o Servidor
```bash
php artisan serve --port=8000
```
O serviço estará pronto em `http://localhost:8000/api`.
