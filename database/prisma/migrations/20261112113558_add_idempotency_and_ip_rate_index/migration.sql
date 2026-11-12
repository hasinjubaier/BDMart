-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "encrypted_token_cache" TEXT,
ADD COLUMN     "idempotency_hash" VARCHAR(64);

-- CreateIndex
CREATE INDEX "idx_otps_ip_created" ON "otp_challenges"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "idx_user_sessions_idempotency" ON "user_sessions"("idempotency_hash");
