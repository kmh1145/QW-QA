import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(4).max(30),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allowIdentityChange: z.boolean(),
  cooldownDays: z.number().int().min(0).max(365),
  showSelfSelectedNotice: z.boolean()
});

function schoolDate(value: string, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}+08:00`);
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const input = schema.parse(await request.json());
    const startsAt = schoolDate(input.startsAt);
    const endsAt = schoolDate(input.endsAt, true);
    if (endsAt <= startsAt) return fail("学年结束日期必须晚于开始日期", 422);
    const current = await db.academicYear.findFirst({ where: { isCurrent: true } });
    if (!current) return fail("尚未设置当前学年", 404);
    const updated = await db.academicYear.update({
      where: { id: current.id },
      data: {
        name: input.name,
        startsAt,
        endsAt,
        allowIdentityChange: input.allowIdentityChange,
        cooldownDays: input.cooldownDays,
        showSelfSelectedNotice: input.showSelfSelectedNotice
      }
    });
    await audit(admin.id, "UPDATE_ACADEMIC_YEAR", "AcademicYear", current.id, {
      name: current.name,
      startsAt: current.startsAt.toISOString(),
      endsAt: current.endsAt.toISOString()
    }, {
      name: updated.name,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString()
    });
    return ok({ id: updated.id });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    if (error instanceof z.ZodError) return fail("学年设置格式不正确", 422, error.flatten().fieldErrors);
    return handleError(error);
  }
}
