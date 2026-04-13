import { z } from "zod";

const schema = z.object({
  APP_PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),

  SEED_USERNAME: z.string().min(1),
  SEED_PASSWORD: z.string().min(8),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),

  POSTGRES_HOST: z.string().default("db"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),

  FILES_DIR: z.string().default("/data/files"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),

  AUTOSAVE_DEBOUNCE_MS: z.coerce.number().int().positive().default(1500),
  AUTOSNAPSHOT_EVERY_N_SAVES: z.coerce.number().int().positive().default(10),
  MAX_AUTOSNAPSHOTS_PER_BOARD: z.coerce.number().int().positive().default(20),

  SHARE_LINKS_ENABLED: z
    .string()
    .transform((v) => v.toLowerCase() === "true")
    .default("true"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("[config] invalid environment:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

const databaseUrl = `postgres://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(
  env.POSTGRES_PASSWORD
)}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;

export const config = {
  ...env,
  databaseUrl,
  isProd: env.NODE_ENV === "production",
  publicUrl: new URL(env.PUBLIC_APP_URL),
};

export type Config = typeof config;
