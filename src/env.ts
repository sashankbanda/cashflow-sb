import { z } from "zod";

/**
 * Zod-validated environment access. Every phase that introduces an environment
 * variable adds it here; nothing in the app reads `process.env` directly.
 *
 * Server values are validated only on the server (client bundles never see
 * them) and the runtime guard throws if one is accessed from the client.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("postgres"), "DATABASE_URL must be a Postgres URL"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

const clientSchema = z.object({});

const isServer = typeof window === "undefined";

function validate<T extends z.ZodTypeAny>(
  schema: T,
  values: Record<string, string | undefined>,
): z.infer<T> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data as z.infer<T>;
}

export const clientEnv = validate(clientSchema, {});

export const env = new Proxy(
  (isServer
    ? validate(serverSchema, {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : {}) as z.infer<typeof serverSchema>,
  {
    get(target, prop: string) {
      if (!isServer) {
        throw new Error(`Attempted to access server env "${prop}" on the client.`);
      }
      return target[prop as keyof typeof target];
    },
  },
);
