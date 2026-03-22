-- AlterEnum: novos valores de UserRole (PostgreSQL; executar uma vez)
ALTER TYPE "UserRole" ADD VALUE 'LOGISTICS';
ALTER TYPE "UserRole" ADD VALUE 'EMPLOYEE';
ALTER TYPE "UserRole" ADD VALUE 'SELLER';
ALTER TYPE "UserRole" ADD VALUE 'STORE_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'MASTER_ADMIN';
