/**
 * Vercel Serverless Function Entry Point
 *
 * This file is a plain JavaScript module (no TypeScript compilation needed).
 * It imports the pre-built Express app from dist/app.js (compiled by esbuild).
 *
 * Vercel routes all /api/* and /checkout/* requests here via vercel.json rewrites.
 */

// The app is compiled by esbuild as part of the build step.
// dist/app.js exports the Express app as default export.
import app from "../dist/app.js";

export default app;
