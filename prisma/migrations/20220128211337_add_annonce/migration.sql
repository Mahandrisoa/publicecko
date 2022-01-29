/*
  Warnings:

  - You are about to drop the column `type` on the `VideoGame` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VideoGame" DROP COLUMN "type",
ADD COLUMN     "categories" TEXT[];

-- CreateTable
CREATE TABLE "Annonce" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER,
    "ratings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categories" TEXT[],

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
