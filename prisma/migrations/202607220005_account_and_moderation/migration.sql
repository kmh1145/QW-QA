ALTER TABLE "EmailVerificationToken" ADD COLUMN "pendingEmail" VARCHAR(320);

CREATE TABLE "UserWarning" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "issuedById" TEXT NOT NULL,
  "reportId" TEXT,
  "reason" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserWarning_userId_createdAt_idx" ON "UserWarning"("userId", "createdAt");

ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_issuedById_fkey"
  FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
