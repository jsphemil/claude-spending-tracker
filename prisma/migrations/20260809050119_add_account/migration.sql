-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SAVINGS', 'INVESTMENT', 'DEPOSIT', 'WALLET', 'CREDIT_CARD');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "openingBalance" DECIMAL(14,2) NOT NULL,
    "openingBalanceDate" DATE NOT NULL,
    "creditLimit" DECIMAL(14,2),
    "budgetModeEnabled" BOOLEAN,
    "monthlyBudget" DECIMAL(14,2),
    "showFutureTransactions" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

