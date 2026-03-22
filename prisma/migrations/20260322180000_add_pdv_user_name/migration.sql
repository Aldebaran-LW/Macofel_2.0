-- AlterTable
ALTER TABLE "users" ADD COLUMN "pdv_user_name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_pdv_user_name_key" ON "users"("pdv_user_name");
