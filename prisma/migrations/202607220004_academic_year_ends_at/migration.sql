ALTER TABLE "AcademicYear" ADD COLUMN "endsAt" TIMESTAMP(3);

UPDATE "AcademicYear"
SET "endsAt" = "startsAt" + INTERVAL '1 year' - INTERVAL '1 day';

ALTER TABLE "AcademicYear" ALTER COLUMN "endsAt" SET NOT NULL;
