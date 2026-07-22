import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(150),
  summary: z.string().trim().min(2).max(300),
  content: z.string().trim().min(2).max(50_000),
  isPinned: z.boolean(),
  isPublic: z.boolean(),
  publishedAt: z.coerce.date()
});

async function requireAdmin() {
  const admin = await requireApiUser();
  if (admin.role !== "ADMIN") throw new AuthError("需要管理员权限", 403);
  return admin;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const before = await db.announcement.findUnique({ where: { id } });
    if (!before || before.deletedAt) return fail("公告不存在", 404);
    const input = announcementSchema.parse(await request.json());
    const announcement = await db.announcement.update({ where: { id }, data: input });
    await audit(admin.id, "UPDATE_ANNOUNCEMENT", "Announcement", id, {
      title: before.title, isPublic: before.isPublic, isPinned: before.isPinned, publishedAt: before.publishedAt
    }, input);
    return ok(announcement);
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const before = await db.announcement.findUnique({ where: { id } });
    if (!before || before.deletedAt) return fail("公告不存在", 404);
    await db.announcement.update({ where: { id }, data: { deletedAt: new Date(), isPublic: false, isPinned: false } });
    await audit(admin.id, "DELETE_ANNOUNCEMENT", "Announcement", id, { title: before.title }, { softDeleted: true });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
