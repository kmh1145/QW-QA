import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) { return NextResponse.json({ ok: true, data }, { status }); }
export function fail(message: string, status = 400, fields?: Record<string, string[] | undefined>) { return NextResponse.json({ ok: false, error: { message, fields } }, { status }); }
export function handleError(error: unknown) {
  if (error instanceof ZodError) return fail("请检查输入内容", 422, error.flatten().fieldErrors);
  if (error instanceof Error && error.message === "CSRF_ORIGIN_MISMATCH") return fail("请求来源无效", 403);
  console.error("Request failed", error instanceof Error ? error.message : "Unknown error");
  return fail("服务器暂时无法处理请求", 500);
}
