-- Origem do evento: painel web, PDV desktop ou bot Telegram
CREATE TYPE "AuditLogSource" AS ENUM ('site', 'pdv', 'telegram');

ALTER TABLE "audit_logs" ADD COLUMN "source" "AuditLogSource" NOT NULL DEFAULT 'site';

CREATE INDEX "audit_logs_source_createdAt_idx" ON "audit_logs"("source", "createdAt");
