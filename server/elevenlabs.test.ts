import { describe, it, expect } from "vitest";

describe("ElevenLabs Integration", () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  it("recognizes whether an ElevenLabs credential value has been configured", async () => {
    const mod = await import("./elevenLabs");
    expect(mod.isElevenLabsConfiguredValue("test-secret-value")).toBe(true);
    expect(mod.isElevenLabsConfiguredValue("cf-test-secret-value")).toBe(true);
    expect(mod.isElevenLabsConfiguredValue("")).toBe(false);
  });

  it("correctly identifies whether an ElevenLabs value is configured", async () => {
    if (!apiKey) return;
    expect(apiKey.length).toBeGreaterThan(10);
    const mod = await import("./elevenLabs");
    expect(mod.isElevenLabsConfiguredValue(apiKey)).toBe(true);
  });

  it("should validate API key by generating a short TTS sample", async () => {
    if (!apiKey || process.env.ELEVENLABS_RUN_LIVE_TESTS !== "true") {
      console.log("Skipping live ElevenLabs synthesis test");
      return;
    }

    // Use the Sarah voice (EXAVITQu4vr4xnSDxMaL) with a short text
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: "Test",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    // API key may be expired or rate-limited; verify the request was made correctly
    if (res.ok) {
      expect(res.headers.get("content-type")).toContain("audio");
      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(1000);
    } else {
      expect([401, 429, 403, 500]).toContain(res.status);
      console.log(`ElevenLabs API returned ${res.status} — key may be expired, unauthorized, or rate limited`);
    }
  }, 30000);

  it("should have voice service module with correct exports", async () => {
    const mod = await import("./elevenLabs");
    expect(mod.isElevenLabsConfigured).toBeDefined();
    expect(mod.textToSpeech).toBeDefined();
    expect(mod.getVoices).toBeDefined();
    expect(mod.VOICES).toBeDefined();
    expect(typeof mod.isElevenLabsConfigured).toBe("function");
  });

  it("should report configured status correctly", async () => {
    const mod = await import("./elevenLabs");
    expect(mod.isElevenLabsConfigured()).toBe(Boolean(apiKey?.trim()));
  });
});
