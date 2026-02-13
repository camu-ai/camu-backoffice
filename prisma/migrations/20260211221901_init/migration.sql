-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "priority" TEXT,
    "source" TEXT,
    "category" TEXT,
    "handler" TEXT,
    "resolution_type" TEXT,
    "self_servable" TEXT,
    "account_id" TEXT,
    "assignee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "first_response_seconds" INTEGER,
    "business_hours_first_response_seconds" INTEGER,
    "resolution_time" TIMESTAMP(3),
    "body_html" TEXT,
    "number_of_touches" INTEGER,
    "link" TEXT,
    "type" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_name" TEXT,
    "body_text" TEXT,
    "body_html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_log" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "issues_synced" INTEGER NOT NULL DEFAULT 0,
    "accounts_synced" INTEGER NOT NULL DEFAULT 0,
    "messages_synced" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "last_issue_updated_at" TIMESTAMP(3),

    CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issues_state_idx" ON "issues"("state");

-- CreateIndex
CREATE INDEX "issues_priority_idx" ON "issues"("priority");

-- CreateIndex
CREATE INDEX "issues_category_idx" ON "issues"("category");

-- CreateIndex
CREATE INDEX "issues_handler_idx" ON "issues"("handler");

-- CreateIndex
CREATE INDEX "issues_account_id_idx" ON "issues"("account_id");

-- CreateIndex
CREATE INDEX "issues_created_at_idx" ON "issues"("created_at");

-- CreateIndex
CREATE INDEX "issues_closed_at_idx" ON "issues"("closed_at");

-- CreateIndex
CREATE INDEX "messages_issue_id_idx" ON "messages"("issue_id");

-- CreateIndex
CREATE INDEX "messages_issue_id_sender_type_created_at_idx" ON "messages"("issue_id", "sender_type", "created_at");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
