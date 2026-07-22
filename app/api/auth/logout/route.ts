import { destroySession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { handleError, ok } from "@/lib/api";
export async function POST(request: Request) { try { assertSameOrigin(request); await destroySession(); return ok({ message: "已退出登录" }); } catch (e) { return handleError(e); } }
