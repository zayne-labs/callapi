// Type definitions for Next.js environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Loaded from `.env` */
      GOOGLE_GENERATIVE_AI_API_KEY?: string
      /** Loaded from `.env` */
      GROQ_API_KEY?: string
    }
  }
}
export {}