-- CreateEnum
CREATE TYPE "ThreadDirection" AS ENUM ('FROM_TEAM', 'FROM_MEMBER');

-- CreateEnum
CREATE TYPE "ThreadSource" AS ENUM ('APP', 'EMAIL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailKind" ADD VALUE 'DIRECT_MESSAGE';
ALTER TYPE "EmailKind" ADD VALUE 'THREAD_REPLY_NOTICE';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "inboxUidNext" INTEGER,
ADD COLUMN     "inboxUidValidity" TEXT,
ADD COLUMN     "lastImapSyncAt" TIMESTAMP(3),
ADD COLUMN     "sentUidNext" INTEGER,
ADD COLUMN     "sentUidValidity" TEXT;

-- CreateTable
CREATE TABLE "thread_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "ThreadDirection" NOT NULL,
    "source" "ThreadSource" NOT NULL,
    "authorId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "emailLogId" TEXT,
    "emailMessageId" TEXT,
    "unreadForManager" BOOLEAN NOT NULL DEFAULT false,
    "unreadForMember" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_messages_emailLogId_key" ON "thread_messages"("emailLogId");

-- CreateIndex
CREATE INDEX "thread_messages_userId_createdAt_idx" ON "thread_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "thread_messages_unreadForManager_idx" ON "thread_messages"("unreadForManager");

-- CreateIndex
CREATE UNIQUE INDEX "thread_messages_userId_emailMessageId_key" ON "thread_messages"("userId", "emailMessageId");

-- CreateIndex
CREATE INDEX "email_log_providerId_idx" ON "email_log"("providerId");

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "email_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;
