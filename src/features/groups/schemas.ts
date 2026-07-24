import { z } from "zod";
import { PALETTES } from "@/components/ui/palette";

export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(50, "Keep it under 50 characters."),
  emoji: z
    .string()
    .trim()
    .max(8, "One emoji is plenty.")
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  gradient: z.enum(PALETTES),
});

export const createGroupSchema = groupFormSchema;

export const updateGroupSchema = groupFormSchema.extend({
  groupId: z.string().min(1),
});

export const archiveGroupSchema = z.object({
  groupId: z.string().min(1),
});

export const addGhostSchema = z.object({
  groupId: z.string().min(1),
  displayName: z
    .string()
    .trim()
    .min(1, "Give your friend a name.")
    .max(50, "Keep it under 50 characters."),
});

export const createInviteSchema = z.object({
  groupId: z.string().min(1),
  /** Set to invite someone to claim a specific ghost member. */
  memberId: z.string().min(1).optional(),
});

export const joinInviteSchema = z.object({
  token: z.string().min(16),
});

export const claimGhostSchema = z.object({
  token: z.string().min(16),
  memberId: z.string().min(1),
});

export const leaveGroupSchema = z.object({
  groupId: z.string().min(1),
});

export type GroupFormInput = z.infer<typeof groupFormSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type ArchiveGroupInput = z.infer<typeof archiveGroupSchema>;
export type AddGhostInput = z.infer<typeof addGhostSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
