"use client";

import { createAuthClient } from "better-auth/react";

/** Browser-side auth API: sign-in/out and reactive session state. */
export const authClient = createAuthClient();

export const { useSession } = authClient;
