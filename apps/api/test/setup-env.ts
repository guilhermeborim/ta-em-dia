// Variáveis mínimas para a API subir nos testes e2e (antes do AppModule ser importado).
process.env.DATABASE_URL ??= 'postgresql://localhost/test';
process.env.JWT_SECRET ??= 'test';
process.env.JWT_REFRESH_SECRET ??= 'test';
