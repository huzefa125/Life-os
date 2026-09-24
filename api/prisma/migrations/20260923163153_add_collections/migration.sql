-- AlterTable
ALTER TABLE "Object" ADD COLUMN     "collectionId" TEXT;

-- CreateIndex
CREATE INDEX "Object_userId_collectionId_status_createdAt_idx" ON "Object"("userId", "collectionId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
