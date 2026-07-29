export const ENV = {
  // App
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Public URL of the deployed app — used for Tap payment redirects and webhook URLs.
  // Set APP_URL in your hosting env (e.g. https://smarthinkerzmicrolearning.com).
  appUrl: (process.env.APP_URL ?? "").replace(/\/$/, ""),

  // Supabase (auth + storage + database)
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",

  // OpenAI-compatible LLM
  // Works with OpenAI, Azure OpenAI, Groq, Together AI, Ollama, etc.
  // Set OPENAI_BASE_URL to override the endpoint (e.g. https://api.groq.com/openai/v1)
  llmApiUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  llmApiKey: process.env.OPENAI_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",

  // Tap Payment Gateway
  tapSecretKey: process.env.TAP_SECRET_KEY ?? "",
  tapPublicKey: process.env.TAP_PUBLIC_KEY ?? "",
  tapWebhookSecret: process.env.TAP_WEBHOOK_SECRET ?? "",

  // ElevenLabs Voice Narration
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",

  // Resend Transactional Email
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
};
