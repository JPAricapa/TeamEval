-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('SELF', 'PEER', 'TEACHER');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- AlterTable users.role: String → UserRole
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";

-- AlterTable evaluation_processes.status: String → ProcessStatus
ALTER TABLE "evaluation_processes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "evaluation_processes" ALTER COLUMN "status" TYPE "ProcessStatus" USING "status"::"ProcessStatus";
ALTER TABLE "evaluation_processes" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ProcessStatus";

-- AlterTable evaluations.type: String → EvaluationType
ALTER TABLE "evaluations" ALTER COLUMN "type" TYPE "EvaluationType" USING "type"::"EvaluationType";

-- AlterTable evaluations.status: String → EvaluationStatus
ALTER TABLE "evaluations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "evaluations" ALTER COLUMN "status" TYPE "EvaluationStatus" USING "status"::"EvaluationStatus";
ALTER TABLE "evaluations" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"EvaluationStatus";

-- AlterTable consolidated_results.criteria_scores: Text → JSONB
ALTER TABLE "consolidated_results"
  ALTER COLUMN "criteria_scores" TYPE JSONB USING
    CASE WHEN "criteria_scores" IS NULL THEN NULL
    ELSE "criteria_scores"::jsonb END;

-- AlterTable team_analytics.outlier_student_ids: Text → JSONB
ALTER TABLE "team_analytics"
  ALTER COLUMN "outlier_student_ids" TYPE JSONB USING
    CASE WHEN "outlier_student_ids" IS NULL THEN NULL
    ELSE "outlier_student_ids"::jsonb END;

-- AlterTable team_analytics.criteria_averages: Text → JSONB
ALTER TABLE "team_analytics"
  ALTER COLUMN "criteria_averages" TYPE JSONB USING
    CASE WHEN "criteria_averages" IS NULL THEN NULL
    ELSE "criteria_averages"::jsonb END;

-- AlterTable course_analytics.weakest_criteria: Text → JSONB
ALTER TABLE "course_analytics"
  ALTER COLUMN "criteria_averages" TYPE JSONB USING
    CASE WHEN "weakest_criteria" IS NULL THEN NULL
    ELSE "weakest_criteria"::jsonb END;

-- AlterTable course_analytics.score_distribution: Text → JSONB
ALTER TABLE "course_analytics"
  ALTER COLUMN "score_distribution" TYPE JSONB USING
    CASE WHEN "score_distribution" IS NULL THEN NULL
    ELSE "score_distribution"::jsonb END;

-- AlterTable course_analytics.criteria_averages: Text → JSONB
ALTER TABLE "course_analytics"
  ALTER COLUMN "criteria_averages" TYPE JSONB USING
    CASE WHEN "criteria_averages" IS NULL THEN NULL
    ELSE "criteria_averages"::jsonb END;
