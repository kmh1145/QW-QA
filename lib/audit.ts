import { headers } from "next/headers";
import { db } from "./db";
export async function audit(operatorId: string, action: string, targetType: string, targetId: string, beforeData?: object, afterData?: object) {
  const h = await headers();
  await db.auditLog.create({ data: { operatorId, action, targetType, targetId, beforeData, afterData, ipAddress: h.get("x-forwarded-for")?.split(",")[0], userAgent: h.get("user-agent") } });
}
