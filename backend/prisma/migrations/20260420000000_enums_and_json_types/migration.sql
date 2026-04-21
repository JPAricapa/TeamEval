-- CreateEnum (safe if already exists)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EvaluationType" AS ENUM ('SELF', 'PEER', 'TEACHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcessStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable users.role
DO $$ BEGIN
  ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable evaluation_processes.status
DO $$ BEGIN
  ALTER TABLE "evaluation_processes" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "evaluation_processes" ALTER COLUMN "status" TYPE "ProcessStatus" USING "status"::"ProcessStatus";
  ALTER TABLE "evaluation_processes" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ProcessStatus";
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable evaluations.type
DO $$ BEGIN
  ALTER TABLE "evaluations" ALTER COLUMN "type" TYPE "EvaluationType" USING "type"::"EvaluationType";
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable evaluations.status
DO $$ BEGIN
  ALTER TABLE "evaluations" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "evaluations" ALTER COLUMN "status" TYPE "EvaluationStatus" USING "status"::"EvaluationStatus";
  ALTER TABLE "evaluations" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"EvaluationStatus";
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable consolidated_results.criteria_scores
DO $$ BEGIN
  ALTER TABLE "consolidated_results"
    ALTER COLUMN "criteria_scores" TYPE JSONB USING
      CASE WHEN "criteria_scores" IS NULL THEN NULL ELSE "criteria_scores"::jsonb END;
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable team_analytics
DO $$ BEGIN
  ALTER TABLE "team_analytics"
    ALTER COLUMN "outlier_student_ids" TYPE JSONB USING
      CASE WHEN "outlier_student_ids" IS NULL THEN NULL ELSE "outlier_student_ids"::jsonb END;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "team_analytics"
    ALTER COLUMN "criteria_averages" TYPE JSONB USING
      CASE WHEN "criteria_averages" IS NULL THEN NULL ELSE "criteria_averages"::jsonb END;
EXCEPTION WHEN others THEN NULL;
END $$;

-- AlterTable course_analytics
DO $$ BEGIN
  ALTER TABLE "course_analytics"
    ALTER COLUMN "weakest_criteria" TYPE JSONB USING
      CASE WHEN "weakest_criteria" IS NULL THEN NULL ELSE "weakest_criteria"::jsonb END;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_analytics"
    ALTER COLUMN "score_distribution" TYPE JSONB USING
      CASE WHEN "score_distribution" IS NULL THEN NULL ELSE "score_distribution"::jsonb END;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_analytics"
    ALTER COLUMN "criteria_averages" TYPE JSONB USING
      CASE WHEN "criteria_averages" IS NULL THEN NULL ELSE "criteria_averages"::jsonb END;
EXCEPTION WHEN others THEN NULL;
END $$;
