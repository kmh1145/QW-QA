import { describe, expect, it } from "vitest"; import { rateLimit } from "@/lib/rate-limit";
describe("频率限制",()=>{it("超过窗口上限时拒绝",()=>{const key=`test-${crypto.randomUUID()}`;expect(rateLimit(key,2,1000).allowed).toBe(true);expect(rateLimit(key,2,1000).allowed).toBe(true);expect(rateLimit(key,2,1000).allowed).toBe(false)})});
