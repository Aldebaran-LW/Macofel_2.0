# 🔧 Editar MONGODB_URI no Vercel - Passo a Passo

## 📋 Connection String Original (da Vercel)

```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority"
```

**Problema:** Falta o nome do banco de dados antes do `?`

## ✅ Connection String Corrigida (para usar no Vercel)

```
MONGODB_URI="mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority"
```

**Diferença:** Adicione `/macofel` antes do `?`

## 🎯 Passo a Passo no Vercel

### 1. Acesse o Dashboard
- URL: https://vercel.com/dashboard
- Faça login na sua conta

### 2. Selecione o Projeto
- Clique em: **materiais-de-construção**

### 3. Vá em Settings
- No menu superior, clique em **Settings**
- Ou no menu lateral, clique em **Configurações**

### 4. Environment Variables
- No menu lateral esquerdo, clique em **Environment Variables**
- Ou role até a seção **Environment Variables**

### 5. Encontre MONGODB_URI
- Procure pela variável `MONGODB_URI` na lista
- Você verá algo como:
  ```
  MONGODB_URI
  mongodb+srv://...@...mongodb.net/?retryWrites=true&w=majority
  ```

### 6. Edite a Variável
- Clique nos **três pontos** (⋯) ao lado da variável
- Ou clique diretamente na variável
- Selecione **Edit**

### 7. Adicione o Nome do Banco
- No campo de valor, você verá:
  ```
  mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/?retryWrites=true&w=majority
  ```
- **Adicione `/macofel` antes do `?`**:
  ```
  mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/macofel?retryWrites=true&w=majority
  ```

### 8. Verifique os Ambientes
- Certifique-se de que está marcado para:
  - ✅ **Production**
  - ✅ **Preview**
  - ✅ **Development**

### 9. Salve
- Clique em **Save** ou **Salvar**

### 10. Redeploy
- Vá em **Deployments**
- Clique nos **três pontos** (⋯) do último deploy
- Selecione **Redeploy**
- Ou faça um novo commit para trigger automático

## 🔍 Verificar se Funcionou

1. Aguarde o deploy completar (2-3 minutos)
2. Acesse: https://materiais-de-construcao.vercel.app/catalogo
3. Abra DevTools (F12) > Console
4. Não deve haver mais erros 500
5. Produtos devem aparecer!

## 📝 Resumo Visual

**Antes:**
```
...mongodb.net/?retryWrites=true&w=majority
            ^ Falta nome do banco
```

**Depois:**
```
...mongodb.net/macofel?retryWrites=true&w=majority
            ^^^^^^^^ Nome do banco adicionado
```

## ⚠️ Importante

- Isso **não altera** a connection string original fornecida pela Vercel
- Apenas edita a **variável de ambiente** usada pelo seu projeto
- O nome do banco `macofel` é o que usamos quando populamos localmente

---

**Edite a variável `MONGODB_URI` no Vercel agora!** 🚀
