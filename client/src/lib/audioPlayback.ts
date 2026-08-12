export function getAudioPlaybackMessage(errorCode?: number | null): string {
  switch (errorCode) {
    case 1:
      return "Audio playback was cancelled.";
    case 2:
      return "Audio download was interrupted. Please try again.";
    case 3:
      return "The audio file could not be decoded. Please regenerate the narration.";
    case 4:
      return "This browser cannot play the generated audio. Please regenerate the narration.";
    default:
      return "Audio playback failed. Please try again.";
  }
}
