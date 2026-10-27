<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

/*
|--------------------------------------------------------------------------
| Rotas da API de Autenticação — LuwiFinance
|--------------------------------------------------------------------------
|
| 100% Open-source, padronizado com Laravel Sanctum e PostgreSQL.
|
*/

// Checagem de integridade e conectividade do serviço
Route::get('/health', function () {
    return response()->json([
        'status' => 'online',
        'service' => 'LuwiFinance Auth Service',
        'database' => 'PostgreSQL',
        'timestamp' => now()->toIso8601String()
    ]);
});

// Rotas públicas de autenticação
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rotas protegidas por Bearer Token (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
