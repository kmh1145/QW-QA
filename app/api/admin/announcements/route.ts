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
  isPinned: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  publishedAt: z.coerce.date()
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const input = announcementSchema.parse(await request.json());
    const announcement = await db.announcement.create({ data: { ...input, authorId: admin.id } });
    await audit(admin.id, "CREATE_ANNOUNCEMENT", "Announcement", announcement.id, undefined, input);
    return ok(announcement, 201);
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
