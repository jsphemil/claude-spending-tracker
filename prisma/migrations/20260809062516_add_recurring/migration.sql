
-- CreateEnum
CREATE TYPE "RecurrenceUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "RecurringExceptionAction" AS ENUM ('SKIPPED', 'MODIFIED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isRecurringException" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRecurringGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "occurrenceDate" DATE,
ADD COLUMN     "recurringRuleId" TEXT;

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "accountId" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "categoryId" TEXT,
    "description" TEXT,
    "intervalCount" INTEGER NOT NULL,
    "intervalUnit" "RecurrenceUnit" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" DATE,
    "supersedesRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringException" (
    "id" TEXT NOT NULL,
    "recurringRuleId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "action" "RecurringExceptionAction" NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "RecurringException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringRule_supersedesRuleId_key" ON "RecurringRule"("supersedesRuleId");

-- CreateIndex
CREATE INDEX "RecurringRule_userId_isActive_idx" ON "RecurringRule"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringException_recurringRuleId_occurrenceDate_key" ON "RecurringException"("recurringRuleId", "occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_recurringRuleId_occurrenceDate_key" ON "Transaction"("recurringRuleId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_supersedesRuleId_fkey" FOREIGN KEY ("supersedesRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringException" ADD CONSTRAINT "RecurringException_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

