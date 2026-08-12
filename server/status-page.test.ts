import { describe, expect, it } from "vitest";

function isAuthorizedTtsProbeStatus(status: number): boolean {
  return status === 200 || status === 400 || status === 422;
}

describe("ElevenLabs TTS health probe", () => {
  it("treats a validation response as proof that a Text-to-Speech scoped key is authorized", () => {
    expect(isAuthorizedTtsProbeStatus(400)).toBe(true);
    expect(isAuthorizedTtsProbeStatus(422)).toBe(true);
  });

  it("does not treat an authentication failure as a healthy response", () => {
    expect(isAuthorizedTtsProbeStatus(401)).toBe(false);
  });
});

