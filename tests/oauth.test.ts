import { describe, expect, it } from "vitest";
import { hashToken } from "../server/auth/oauth.js";

describe("oauth helpers", () => {
  it("stores only a hash of provider access tokens", () => {
    const token = "provider-token";
    const hashed = hashToken(token);

    expect(hashed).toHaveLength(64);
    expect(hashed).not.toBe(token);
  });

  it("returns null for missing provider tokens", () => {
    expect(hashToken(null)).toBeNull();
    expect(hashToken(undefined)).toBeNull();
  });
});
