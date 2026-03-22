# Checklist de segurança — Macofel 2.0 + PDV-Macofel

Ordem pensada para **mínimo risco de regressão**. Itens de **rotação / troca de chaves ficam no fim** (última fase).

Para cada fase: marque `[ ]` → `[x]` quando concluído; após alterações em API, testar **catálogo**, **POST venda PDV**, **sync desktop** e **`/loja`** se usarem.

**Execução automática (agente):** Fases 1–2 (parcial), 4 (headers), 5 (doc PDV), CSP Tauri; **Fase 6 não executada** (chaves por último). Fase 0 item 3: o repositório ainda contém **credenciais históricas** em vários `.md`/`.ps1` — limpeza gradual + **Fase 6** recomendadas.

---

## Fase 0 — Inventário (zero mudança de código)

- [x] **Listar consumidores das APIs:** desktop PDV (Tauri), build web/embed PDV, scripts internos, Postman/curl. *(Resumo no `README.md` — secção PDV / segurança operacional.)*
- [ ] **Confirmar variáveis obrigatórias em produção:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `MONGODB_URI`, `PDV_API_KEY`, `DATABASE_URL` (e outras já em uso). *Manual na Vercel / painéis.*
- [ ] **Procurar segredos em ficheiros versionados:** `grep`/revisão manual em `*.md`, `*.ps1`, exemplos — substituir por placeholders e remover credenciais reais do histórico se alguma vez tiver sido commitada (git filter ou suporte Git). *Pendente em massa; `README` já não lista Project Ref Supabase em claro.*

---

## Fase 1 — Hardening passivo (baixo risco de quebrar fluxos)

- [x] **Documentar** no README ou runbook interno: quem pode aceder `/loja`, que a chave PDV é sensível e que o catálogo depende de `NEXTAUTH_URL` +/ou `PDV_API_KEY` (`lib/api-catalog-guard.ts`).
- [ ] **Garantir em produção** que `NEXTAUTH_URL` está definido e correto — evita o modo “compat” do guard de catálogo quando não há chave configurada.
- [x] **Revisar logs:** evitar `console.log` com emails, corpos de pedido completos ou chaves em rotas `/api/*` (especialmente PDV e auth). *PDV sale/void: logs detalhados só em `NODE_ENV === 'development'`.*
- [x] **PDV desktop (`PDV-Macofel`):** em `tauri.conf.json`, alinhar `connect-src` da CSP ao **hostname real** do site em produção (além de `*.vercel.app` se aplicável), para não bloquear sync nem abrir demasiado. *Incluído `*.macofelparapua.com` + hosts explícitos.*

---

## Fase 2 — Correções de integridade (código; testar bem antes de deploy)

- [x] **Idempotência em `POST /api/pdv/sale`:** antes de `insertOne`, verificar se já existe documento com o mesmo `pdvVendaId` / `body.id`. Se existir, responder **200** com mensagem de “já processada” e **não** voltar a descontar stock. *Isto não muda o contrato do PDV; só evita duplicados em retry/replay.*
- [x] **Implementar `POST /api/pdv/sale/void`** (Macofel) alinhado ao que o Rust já envia — ou documentar oficialmente “estorno só local” até existir. *Rota em `app/api/pdv/sale/void/route.ts`; idempotente.*

---

## Fase 3 — Reduzir exposição sem mudar chaves (pode exigir ajuste em painéis/scripts)

- [x] **`GET /api/pdv/sale`:** hoje aceita a mesma `PDV_API_KEY` que o POST. Opções seguras (escolher uma e comunicar à equipa):
  - **A)** Exigir **sessão NextAuth** admin/master *e* manter ou não o header da chave como reforço; **ou**
  - **B)** Manter só API key mas documentar que é endpoint “operacional” e nunca expor a chave em frontends.
  - *O PDV desktop não usa este GET no código atual; validar se há ferramentas externas que usam GET com a chave.* **→ Opção B documentada em comentário no `route.ts` + README.**
- [ ] **`/loja` (embed):** planear substituição gradual da entrega da **chave permanente** no `postMessage` por **token de curta duração** emitido por uma rota API autenticada (ex.: válido 15–60 min). *Exige mudança coordenada no `PdvLojaShell` + PDV embed; fazer em branch e testar iframe same-origin.*

---

## Fase 4 — Defesa em profundidade (opcional; configurar com limites altos no início)

- [ ] **Rate limiting** (Vercel Edge, middleware ou serviço à frente) em `POST /api/pdv/sale` e eventualmente em `GET /api/products` sem chave — começar com limites generosos para não bloquear sync legítimo.
- [x] **Headers de segurança** (`next.config.js`): CSP report-only primeiro, depois endurecer; `X-Content-Type-Options`, `Referrer-Policy`, etc., conforme política do projeto. *Aplicados `nosniff`, `Referrer-Policy`, `Permissions-Policy` global; CSP global não aplicada (app legacy).*
- [ ] **Uploads / admin:** confirmar validação de tipo e tamanho de ficheiros nas rotas de upload já existentes.

---

## Fase 5 — PDV desktop e operação (fora do deploy Vercel)

- [x] **Permissões do `.env`** no Windows (apenas utilizadores necessários). *Procedimento no `README.md` do PDV-Macofel.*
- [x] **Backup do SQLite** do PDV (agendado ou procedimento manual documentado). *Idem.*
- [x] **DevNota:** tokens só no `.env`; nunca em repositório; procedimento de rotação documentado junto da fase 6. *Referência cruzada no README PDV.*

---

## Fase 6 — Rotação de chaves e segredos (**por último** — não executada)

Fazer **numa janela de manutenção**; ordem sugerida para não cortar serviço:

1. [ ] Gerar novos valores (`NEXTAUTH_SECRET`, `PDV_API_KEY`, chaves Supabase/Mongo **se** política interna exigir).
2. [ ] Atualizar **primeiro** no servidor (Vercel / env) e **testar** login + uma venda PDV de teste.
3. [ ] Atualizar **todos** os `.env` locais / PDVs em campo (`MACOFEL_API_KEY` = novo `PDV_API_KEY`).
4. [ ] Atualizar embed/builds se usarem `VITE_MACOFEL_API_KEY` em ambientes não embed.
5. [ ] Invalidar ou rotacionar credenciais antigas nos fornecedores (Mongo, Supabase, DevNota) conforme o que foi trocado.
6. [ ] Confirmar que ficheiros de documentação **não** contêm os novos segredos em claro.

---

## Verificação rápida pós-deploy (smoke test)

- [ ] Login cliente e admin.
- [ ] Página de produtos no site (catálogo) carrega.
- [ ] `GET /api/products` com `PDV_API_KEY` (ou fluxo real do PDV) devolve JSON esperado.
- [ ] Uma venda de teste: `POST /api/pdv/sale` → 200 e stock coerente no Mongo.
- [ ] `/loja` com utilizador autorizado abre o PDV embed e sincroniza.
- [ ] Retry da **mesma** venda (mesmo `id`) não duplica registo nem stock (idempotência).
- [ ] `POST /api/pdv/sale/void` com `venda_id` de teste repõe stock e marca `cancelada` (ou noop se não existir).

---

*Última atualização: execução parcial do checklist no código; concluir itens manuais e smoke tests antes de produção.*
