// Zod schemas at system boundaries: API routes and server actions.
// Nothing from a request body reaches business logic unvalidated.

import { z } from "zod";

export const leadSearchInputSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, "Keyword must be at least 2 characters")
    .max(100),
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters")
    .max(120),
  radiusMi: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export type LeadSearchInput = z.infer<typeof leadSearchInputSchema>;

export const leadExportInputSchema = z.object({
  keyword: z.string().trim().min(2, "Keyword must be at least 2 characters").max(100),
  location: z.string().trim().min(2, "Location must be at least 2 characters").max(120),
  radiusMi: z.number().int().min(1).max(100).default(25),
});

export const noteInputSchema = z.object({
  businessId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export const proposalUpdateSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  opening: z.string().trim().min(1).max(2000),
  solution: z.string().trim().min(1).max(2000),
  cta: z.string().trim().max(500),
  signature: z.string().trim().max(300),
});

export const leadStatusUpdateSchema = z.object({
  businessId: z.string().min(1),
  status: z.enum([
    "NEW",
    "QUEUED_FOR_AUDIT",
    "AUDITED",
    "QUALIFIED",
    "CONTACTED",
    "RESPONDED",
    "WON",
    "LOST",
    "DISQUALIFIED",
  ]),
});

export const registerInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
