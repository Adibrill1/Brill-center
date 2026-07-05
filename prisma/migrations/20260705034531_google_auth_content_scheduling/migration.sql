-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('WHATSAPP', 'FLYER', 'SOCIAL');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "google_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "generated_content" (
    "id" TEXT NOT NULL,
    "space_id" TEXT,
    "type" "ContentType" NOT NULL,
    "language" "Language" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_content_type_created_at_idx" ON "generated_content"("type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

