import { describe, expect, it } from "vitest";
import { getAudioPlaybackMessage } from "../client/src/lib/audioPlayback";

describe("audio playback error messages", () => {
  it("explains media network failures without using a generic error", () => {
    expect(getAudioPlaybackMessage(2)).toBe("Audio download was interrupted. Please try again.");
  });

  it("guides a user to regenerate audio that cannot be decoded", () => {
    expect(getAudioPlaybackMessage(3)).toBe("The audio file could not be decoded. Please regenerate the narration.");
  });

  it("provides a safe fallback for an unknown media error", () => {
    expect(getAudioPlaybackMessage(undefined)).toBe("Audio playback failed. Please try again.");
  });
});
