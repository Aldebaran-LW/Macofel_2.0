# 🔧 MONGODB_URI Corrigida

## ❌ Versão Atual (ERRADA)

```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"
```

**Problema:** Falta o nome do banco de dados antes do `?`

## ✅ Versão Corrigida (CORRETA)

```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority"
```

**Diferença:** Adicione `/macofel` antes do `?`

## 📋 Como Atualizar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione: **materiais-de-construção**
3. Vá em: **Settings** > **Environment Variables**
4. Encontre: `MONGODB_URI`
5. Clique em: **Edit** (ou os três pontos)
6. Cole a versão corrigida acima
7. Salve
8. Faça **Redeploy**

## 🎯 Formato da Connection String

```
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
                                                          ^^^^^^^^^^^^^^^^
                                                          Nome do banco!
```

**Estrutura:**
- `mongodb+srv://` - Protocolo
- `USER:PASSWORD@` - Credenciais
- `CLUSTER.mongodb.net` - Endereço do cluster
- `/DATABASE_NAME` - **NOME DO BANCO** (obrigatório!)
- `?retryWrites=true&w=majority` - Parâmetros

## ✅ Após Atualizar

1. Vá em **Deployments**
2. Clique nos **três pontos** do último deploy
3. Selecione **Redeploy**
4. Aguarde 2-3 minutos
5. Teste: https://materiais-de-construcao.vercel.app/catalogo

---

**Use a versão corrigida com `/macofel`!** 🚀
