-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProgramLanguage" AS ENUM ('JAVASCRIPT');

-- CreateEnum
CREATE TYPE "ChallengeAttemptStatus" AS ENUM ('STARTED', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceCode" TEXT NOT NULL,
    "language" "ProgramLanguage" NOT NULL DEFAULT 'JAVASCRIPT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "bestTimeMs" INTEGER,
    "bestScore" INTEGER,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChallengeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "runId" INTEGER NOT NULL,
    "status" "ChallengeAttemptStatus" NOT NULL,
    "elapsedTimeMs" INTEGER,
    "score" INTEGER,
    "stars" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Program_userId_idx" ON "Program"("userId");
CREATE INDEX "Program_userId_updatedAt_idx" ON "Program"("userId", "updatedAt");
CREATE UNIQUE INDEX "ChallengeProgress_userId_challengeId_key" ON "ChallengeProgress"("userId", "challengeId");
CREATE INDEX "ChallengeProgress_userId_idx" ON "ChallengeProgress"("userId");
CREATE INDEX "ChallengeProgress_challengeId_idx" ON "ChallengeProgress"("challengeId");
CREATE UNIQUE INDEX "ChallengeAttempt_userId_challengeId_runId_key" ON "ChallengeAttempt"("userId", "challengeId", "runId");
CREATE INDEX "ChallengeAttempt_userId_idx" ON "ChallengeAttempt"("userId");
CREATE INDEX "ChallengeAttempt_challengeId_idx" ON "ChallengeAttempt"("challengeId");
CREATE INDEX "ChallengeAttempt_createdAt_idx" ON "ChallengeAttempt"("createdAt");
CREATE INDEX "ChallengeAttempt_userId_createdAt_idx" ON "ChallengeAttempt"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeProgress" ADD CONSTRAINT "ChallengeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
