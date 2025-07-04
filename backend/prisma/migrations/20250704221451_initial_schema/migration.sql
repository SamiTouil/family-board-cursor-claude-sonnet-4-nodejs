-- CreateEnum
CREATE TYPE "FamilyMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "FamilyInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FamilyJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskOverrideAction" AS ENUM ('ADD', 'REMOVE', 'REASSIGN');

-- CreateEnum
CREATE TYPE "WeekTemplateRule" AS ENUM ('EVEN_WEEKS', 'ODD_WEEKS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "avatar_url" TEXT,
    "is_virtual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "creator_id" TEXT NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "role" "FamilyMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "FamilyInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "family_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT,

    CONSTRAINT "family_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_join_requests" (
    "id" TEXT NOT NULL,
    "status" "FamilyJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "message" TEXT,
    "user_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "invite_id" TEXT NOT NULL,
    "reviewer_id" TEXT,

    CONSTRAINT "family_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "defaultStartTime" TEXT NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "family_id" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "family_id" TEXT NOT NULL,

    CONSTRAINT "day_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_template_items" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "task_id" TEXT NOT NULL,
    "override_time" TEXT,
    "override_duration" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "day_template_id" TEXT NOT NULL,

    CONSTRAINT "day_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "apply_rule" "WeekTemplateRule",
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "family_id" TEXT NOT NULL,

    CONSTRAINT "week_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_template_days" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "day_template_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "week_template_id" TEXT NOT NULL,

    CONSTRAINT "week_template_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_overrides" (
    "id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_template_id" TEXT,
    "family_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "week_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_overrides" (
    "id" TEXT NOT NULL,
    "assigned_date" TIMESTAMP(3) NOT NULL,
    "task_id" TEXT NOT NULL,
    "action" "TaskOverrideAction" NOT NULL,
    "original_member_id" TEXT,
    "new_member_id" TEXT,
    "override_time" TEXT,
    "override_duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "week_override_id" TEXT NOT NULL,

    CONSTRAINT "task_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_user_id_family_id_key" ON "family_members"("user_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_invites_code_key" ON "family_invites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "family_join_requests_user_id_family_id_key" ON "family_join_requests"("user_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "day_templates_family_id_name_key" ON "day_templates"("family_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "day_template_items_day_template_id_member_id_task_id_key" ON "day_template_items"("day_template_id", "member_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "week_templates_family_id_name_key" ON "week_templates"("family_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "week_template_days_week_template_id_dayOfWeek_key" ON "week_template_days"("week_template_id", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "week_overrides_family_id_week_start_date_key" ON "week_overrides"("family_id", "week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "task_overrides_week_override_id_assigned_date_task_id_key" ON "task_overrides"("week_override_id", "assigned_date", "task_id");

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "family_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_templates" ADD CONSTRAINT "day_templates_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_template_items" ADD CONSTRAINT "day_template_items_day_template_id_fkey" FOREIGN KEY ("day_template_id") REFERENCES "day_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_template_items" ADD CONSTRAINT "day_template_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_template_items" ADD CONSTRAINT "day_template_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_templates" ADD CONSTRAINT "week_templates_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_template_days" ADD CONSTRAINT "week_template_days_week_template_id_fkey" FOREIGN KEY ("week_template_id") REFERENCES "week_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_template_days" ADD CONSTRAINT "week_template_days_day_template_id_fkey" FOREIGN KEY ("day_template_id") REFERENCES "day_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_overrides" ADD CONSTRAINT "week_overrides_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_overrides" ADD CONSTRAINT "week_overrides_week_template_id_fkey" FOREIGN KEY ("week_template_id") REFERENCES "week_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_week_override_id_fkey" FOREIGN KEY ("week_override_id") REFERENCES "week_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_original_member_id_fkey" FOREIGN KEY ("original_member_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_new_member_id_fkey" FOREIGN KEY ("new_member_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
