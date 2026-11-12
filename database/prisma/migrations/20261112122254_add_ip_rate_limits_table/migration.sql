-- CreateTable
CREATE TABLE "ip_rate_limits" (
    "ip_address" VARCHAR(45) NOT NULL,
    "window_bucket" BIGINT NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_rate_limits_pkey" PRIMARY KEY ("ip_address","window_bucket")
);
