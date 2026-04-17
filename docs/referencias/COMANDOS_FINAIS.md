# 🚀 Comandos Finais - Executar Manualmente

## ⚠️ Importante

Os comandos podem demorar alguns segundos para conectar. Se algum comando for cancelado, execute novamente.

## 📋 Sequência de Comandos:

### 1. Aplicar Schema ao Banco

```powershell
cd nextjs_space
npx prisma db push --accept-data-loss
```

**O que faz:** Cria todas as tabelas no banco de dados conforme o schema Prisma.

**Tempo estimado:** 10-30 segundos

**Se der erro:** Verifique se a connection string no `.env` está correta.

### 2. Popular Banco (Opcional)

```powershell
npx prisma db seed
```

**O que faz:** Insere dados de exemplo (usuários, categorias, produtos).

**Tempo estimado:** 5-10 segundos

### 3. Iniciar Servidor

```powershell
npm run dev
```

**O que faz:** Inicia o servidor Next.js em modo desenvolvimento.

**Acesse:** http://localhost:3000

## ✅ Verificar se Funcionou:

### Testar Conexão com Banco:

```powershell
npx prisma studio
```

Isso abrirá uma interface visual do banco. Se conseguir ver as tabelas, está tudo OK!

### Verificar Servidor:

1. Acesse: http://localhost:3000
2. Você deve ver a página inicial do MACOFEL
3. Tente fazer login com:
   - Email: `admin@macofel.com`
   - Senha: `admin123`

## 🔧 Troubleshooting:

### Erro: "Can't reach database server"
- Verifique se o Supabase está ativo
- Confirme a senha no `.env`
- Tente usar Session Pooler em vez de Transaction Pooler

### Erro: "Table does not exist"
- Execute `npx prisma db push` novamente
- Verifique se a connection string está correta

### Servidor não inicia
- Verifique se a porta 3000 está livre
- Execute `npm install` novamente se necessário

---

**Após executar todos os comandos, seu projeto estará rodando!** 🎉
