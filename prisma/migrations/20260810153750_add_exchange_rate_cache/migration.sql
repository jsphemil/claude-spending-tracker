-- CreateTable
CREATE TABLE "ExchangeRateCache" (
    "currency" TEXT NOT NULL,
    "rateToInr" DECIMAL(18,6) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateCache_pkey" PRIMARY KEY ("currency")
);
