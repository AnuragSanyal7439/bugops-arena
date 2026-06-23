import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

describe("debugging workspace component shell", () => {
  it("renders editor, test, output, diff, and hint regions with keyboardable controls", () => {
    const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    const dom = new JSDOM(html);
    const document = dom.window.document;

    expect(document.querySelector("#editor-host")?.getAttribute("role")).toBe("application");
    expect(document.querySelector("#visible-tests")).toBeTruthy();
    expect(document.querySelector("#hidden-tests")).toBeTruthy();
    expect(document.querySelector("#console-output")).toBeTruthy();
    expect(document.querySelector("#compiler-output")).toBeTruthy();
    expect(document.querySelector("#expected-actual-output")).toBeTruthy();
    expect(document.querySelector("#diff-panel")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector("#hint-ladder")?.getAttribute("aria-label")).toBe("Progressive hints");

    const runTests = document.querySelector<HTMLButtonElement>("#run-tests");
    const resetCode = document.querySelector<HTMLButtonElement>("#reset-code");
    const toggleDiff = document.querySelector<HTMLButtonElement>("#toggle-diff");

    expect(runTests?.tagName).toBe("BUTTON");
    expect(resetCode?.tagName).toBe("BUTTON");
    expect(toggleDiff?.getAttribute("aria-expanded")).toBe("false");
  });
});
