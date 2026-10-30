-- Preserve every legacy address conservatively. New editor records explicitly opt into auto mode.
ALTER TABLE "Post" ADD COLUMN "urlMode" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Work" ADD COLUMN "urlMode" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Post" ALTER COLUMN "urlMode" SET DEFAULT 'auto';
ALTER TABLE "Work" ALTER COLUMN "urlMode" SET DEFAULT 'auto';
ALTER TABLE "Post" ADD CONSTRAINT "Post_urlMode_check" CHECK ("urlMode" IN ('auto', 'manual'));
ALTER TABLE "Work" ADD CONSTRAINT "Work_urlMode_check" CHECK ("urlMode" IN ('auto', 'manual'));
