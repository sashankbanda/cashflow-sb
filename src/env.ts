import { z } from "zod";

/**
 * Zod-validated environment access. Every phase that introduces an environment
 * variable adds it here; nothing in the app reads `process.env` directly.
 *
 * `server` values must never be imported from client components — the runtime
 * guard below throws if that happens.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({});

function validate<T extends z.ZodTypeAny>(schema: T, values: Record<string, string | undefined>): z.infer<T> {
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
  validate(serverSchema, {
    NODE_ENV: process.env.NODE_ENV,
  }),
  {
    get(target, prop: string) {
      if (typeof window !== "undefined") {
        throw new Error(`Attempted to access server env "${prop}" on the client.`);
      }
      return target[prop as keyof typeof target];
    },
  },
);
