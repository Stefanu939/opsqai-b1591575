import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { assertMode, currentServerMode, ModeAssertionError } from "../deployment-mode.server";

describe("deployment-mode.server", () => {
  const prev = process.env.OPSQAI_MODE;
  beforeEach(() => {
    delete process.env.OPSQAI_MODE;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.OPSQAI_MODE;
    else process.env.OPSQAI_MODE = prev;
  });

  it("defaults to mc when env is unset", () => {
    expect(currentServerMode()).toBe("mc");
  });

  it("reads selfhost from env", () => {
    process.env.OPSQAI_MODE = "selfhost";
    expect(currentServerMode()).toBe("selfhost");
  });

  it("assertMode passes when modes match", () => {
    process.env.OPSQAI_MODE = "mc";
    expect(() => assertMode("mc")).not.toThrow();
  });

  it("assertMode throws ModeAssertionError on mismatch", () => {
    process.env.OPSQAI_MODE = "selfhost";
    expect(() => assertMode("mc")).toThrow(ModeAssertionError);
  });

  it("error carries expected and actual", () => {
    process.env.OPSQAI_MODE = "mc";
    try {
      assertMode("selfhost");
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ModeAssertionError);
      const err = e as ModeAssertionError;
      expect(err.expected).toBe("selfhost");
      expect(err.actual).toBe("mc");
    }
  });
});
