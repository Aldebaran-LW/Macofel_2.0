# Ping ao bot Telegram (Render) com cron-job.org

Documentação de referência — **sem implementação de código** no repositório por agora.

## Objetivo

No plano gratuito do **Render**, o Web Service do bot (`macofel-telegram-bot`) pode **hibernar** após inatividade. Um pedido HTTP periódico ao endpoint de **health** mantém o serviço acordado com mais previsibilidade do que depender só do agendamento do GitHub Actions.

- **Health do bot:** `https://macofel-telegram-bot.onrender.com/health` (ou `/`)

No repositório existe também o workflow `.github/workflows/ping-telegram-bot.yml`, que faz o mesmo tipo de pedido; o **cron-job.org** é uma alternativa ou complemento **externo** ao GitHub.

## Opção A — Consola web (recomendado para começar)

1. Criar conta em [cron-job.org](https://cron-job.org/) e entrar no [Console](https://console.cron-job.org/).
2. **Create cronjob** (ou equivalente).
3. **URL:** `https://macofel-telegram-bot.onrender.com/health`
4. **Método:** GET.
5. **Agendamento:** por exemplo a cada **5–10 minutos** (ajusta às regras do plano e ao que o Render tolerar).
6. Guardar e ativar o job.

Não é necessária API REST para isto.

### Exemplo já usado no projeto (consola web)

Configuração de referência alinhada ao bot no Render:

| Campo | Valor |
|--------|--------|
| Título | `Telegram Macofel` |
| URL | `https://macofel-telegram-bot.onrender.com/health` |
| Job ativo | Sim (**Habilitar job**) |
| Guardar resposta | Sim (útil para ver no histórico se o Render devolveu `200` e corpo `ok`) |
| Agendamento | A cada **10 minutos** |
| Expressão Crontab | `*/10 * * * *` (UTC na API; na UI pode aparecer com fuso **America/Sao_Paulo**) |
| Expiração do agendamento | Desligado (job não expira) |
| Notificações | Ex.: avisar em **falhas de execução** após **1** falha consecutiva |

O ID do job na consola aparece no URL ao editar (ex.: `console.cron-job.org/jobs/<jobId>`). Guarda esse número só para ti se fores usar a **API REST** (`PATCH /jobs/<jobId>`).

## Opção B — API REST (automação / integração)

Documentação oficial: [REST API — cron-job.org](https://docs.cron-job.org/rest-api.html)

Resumo útil:

| Item | Valor |
|------|--------|
| Base | `https://api.cron-job.org/` |
| Autenticação | `Authorization: Bearer <API_KEY>` |
| Corpo (quando aplicável) | JSON + header `Content-Type: application/json` |
| Criar job | `PUT /jobs` com objeto `{ "job": { ... } }` (campo obrigatório: `url`) |
| Alterar job | `PATCH /jobs/<jobId>` |
| Listar | `GET /jobs` |

**Limites:** quota diária de pedidos à API (por defeito baixa; ver doc); rate limits por método (ex.: criação de jobs limitada por segundo/minuto).

**Segurança:** a API key é equivalente a uma password — guardar só em **secrets** (nunca no Git), preferir restrição por IP na consola se fizer sentido.

## Variáveis de ambiente (referência futura)

Se mais tarde existir script ou CI que chame a API do cron-job.org, o nome sugerido (não obrigatório hoje) seria algo como:

- `CRON_JOB_ORG_API_KEY` — Bearer token da consola cron-job.org  
- Opcional: `CRON_JOB_ORG_JOB_ID` — se quiseres só fazer `PATCH` para ativar/desativar um job fixo

**Não** colocar estes valores no repositório nem neste ficheiro.

## Relação com o site (middleware)

O projeto pode acordar o bot a partir do site (`lib/telegram-render-wake.ts` / middleware). Isso é **adicional** ao ping agendado: visitas ao site não substituem um cron fiável se o objetivo for manter o Render sempre quente.

## Histórico / troubleshooting

- Se o job falhar, na consola do cron-job.org vê o **histórico** e o código HTTP devolvido pelo Render.
- **401** na API cron-job.org: chave inválida.
- **403** na API: origem IP não permitida (se configuraste allowlist).

---

*Última atualização: documentação inicial só em texto; integração por código fica para quando quiseres.*
