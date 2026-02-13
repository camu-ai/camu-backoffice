-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "session_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issues_state_priority_idx" ON "issues"("state", "priority");

-- CreateIndex
CREATE INDEX "issues_state_priority_created_at_idx" ON "issues"("state", "priority", "created_at");

-- CreateIndex
CREATE INDEX "issues_assignee_id_created_at_idx" ON "issues"("assignee_id", "created_at");
