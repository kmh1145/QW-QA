import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

describe("敏感设置加密", () => {
  const key = "test-only-key-material-that-is-long-enough";

  it("可以加密并解密 SMTP 密码或 AI Key", () => {
    const encrypted = encryptSecret("secret-value", key);
    expect(encrypted).not.toContain("secret-value");
    expect(decryptSecret(encrypted, key)).toBe("secret-value");
  });

  it("使用错误密钥时拒绝解密", () => {
    const encrypted = encryptSecret("secret-value", key);
    expect(() => decryptSecret(encrypted, "different-test-key-material-value")).toThrow();
  });
});
