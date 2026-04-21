-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "game_settings" (
    "key" VARCHAR(50) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sprites" (
    "key" VARCHAR(100) NOT NULL,
    "image_data" BYTEA NOT NULL,
    "mime_type" VARCHAR(20) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprites_pkey" PRIMARY KEY ("key")
);

