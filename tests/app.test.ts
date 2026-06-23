import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";

describe("express app", () => {
  const app = createApp();

  it("reports configured auth providers", async () => {
    const response = await request(app).get("/api/auth/providers").expect(200);

    expect(response.body).toEqual({
      data: {
        google: false,
        github: false
      }
    });
  });

  it("does not expose backend source files as static assets", async () => {
    const response = await request(app).get("/server/config.ts").expect(200);

    expect(response.text).toContain("<!DOCTYPE html>");
    expect(response.text).not.toContain("SESSION_SECRET");
  });
});
