/**
 * ElevenLabs Voice Service
 * 
 * Text-to-speech integration for lesson narration.
 * Uses ElevenLabs API v1 for high-quality voice synthesis.
 */

import { ENV } from "./_core/env";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// Default voice IDs from ElevenLabs
export const VOICES = {
  rachel: "21m00Tcm4TlvDq8ikWAM",   // Rachel - calm, clear female
  drew: "29vD33N1CtxCmqQRPOHJ",      // Drew - confident male
  clyde: "2EiwWnXFnvU5JabPnv8n",     // Clyde - warm male
  domi: "AZnzlk1XvdvUeBnXmlld",      // Domi - strong female
  dave: "CYw3kZ02Hs0563khs1Fj",      // Dave - conversational male
  fin: "D38z5RcWu1voky8WS1ja",       // Fin - authoritative male
  sarah: "EXAVITQu4vr4xnSDxMaL",     // Sarah - soft, friendly female
  adam: "pNInz6obpgDQGcFmaJgB",       // Adam - deep male
  sam: "yoZ06aMxZJJ28mfd3POQ",       // Sam - dynamic male
} as const;

export type VoiceId = keyof typeof VOICES;

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;       // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
  style?: number;           // 0-1, default 0
  useSpeakerBoost?: boolean;
}

interface VoiceInfo {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

export function isElevenLabsConfiguredValue(apiKey?: string): boolean {
  return Boolean(apiKey?.trim());
}

function requireElevenLabsApiKey(): string {
  const apiKey = ENV.elevenLabsApiKey.trim();
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured");
  }
  return apiKey;
}

function createElevenLabsError(operation: string, status: number, error: string): Error {
  if (error.includes("api_key_id_used_as_api_key")) {
    return new Error(
      "ElevenLabs rejected the configured credential because it is a key ID, not the secret API key. Copy the secret value shown when the key is created or rotated."
    );
  }
  return new Error(`ElevenLabs ${operation} error: ${status} ${error}`);
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return isElevenLabsConfiguredValue(ENV.elevenLabsApiKey);
}

/**
 * Get available voices from ElevenLabs
 */
export async function getVoices(): Promise<VoiceInfo[]> {
  const apiKey = requireElevenLabsApiKey();

  const res = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw createElevenLabsError("API", res.status, error);
  }

  const data = await res.json();
  return data.voices || [];
}

/**
 * Convert text to speech using ElevenLabs
 * Returns audio as a Buffer (MP3 format)
 */
export async function textToSpeech(options: TextToSpeechOptions): Promise<Buffer> {
  const apiKey = requireElevenLabsApiKey();

  const voiceId = options.voiceId || VOICES.sarah;
  const modelId = options.modelId || "eleven_multilingual_v2";

  const res = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: options.text,
      model_id: modelId,
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0,
        use_speaker_boost: options.useSpeakerBoost ?? true,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw createElevenLabsError("TTS", res.status, error);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert text to speech and return as a streaming response
 */
export async function textToSpeechStream(options: TextToSpeechOptions): Promise<ReadableStream<Uint8Array>> {
  const apiKey = requireElevenLabsApiKey();

  const voiceId = options.voiceId || VOICES.sarah;
  const modelId = options.modelId || "eleven_multilingual_v2";

  const res = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/stream`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: options.text,
      model_id: modelId,
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0,
        use_speaker_boost: options.useSpeakerBoost ?? true,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw createElevenLabsError("TTS stream", res.status, error);
  }

  if (!res.body) {
    throw new Error("No response body from ElevenLabs");
  }

  return res.body as ReadableStream<Uint8Array>;
}

/**
 * Get user subscription info (remaining characters, etc.)
 */
export async function getSubscriptionInfo() {
  const apiKey = requireElevenLabsApiKey();

  const res = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw createElevenLabsError("subscription", res.status, error);
  }

  return res.json();
}
