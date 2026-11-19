
import { z } from "zod";

export const eventProposalSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(20).max(5000),
    objectives: z.string().trim().max(3000).optional(),
    venue: z.string().trim().min(2).max(200),
    start_date: z.string().date(),
    end_date: z.string().date(),
    estimated_budget: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) {
          return undefined;
        }
        return Number(value);
      },
      z.number().finite().min(0).max(9999999999.99).multipleOf(0.01).optional()
    ),
  })
  .refine(
    (data) => data.end_date >= data.start_date,
    {
      message: "End date must be on or after the start date.",
      path: ["end_date"],
    }
  );

export type EventProposalInput = z.infer<typeof eventProposalSchema>;

export const eventRequestSchema = eventProposalSchema.safeExtend({
  event_type: z.enum(["Workshop", "Technical", "Cultural", "Sports", "Other"]),
  objectives: z.string().trim().min(1, "Enter your event objectives.").max(3000),
  resource_person: z.string().trim().max(200),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid start time."),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid end time."),
  duration: z.string().trim().max(100),
  department: z.string().trim().min(1, "Choose a department.").max(200),
  expected_participants: z.preprocess(
    (value) => value === "" || value == null ? undefined : Number(value),
    z.number().int().min(1, "Enter at least 1 participant.").max(1000000),
  ),
  target_audience: z.string().trim().min(1, "Choose a target audience.").max(300),
  estimated_budget: z.preprocess(
    (value) => value === "" || value == null ? undefined : Number(value),
    z.number().finite().min(0).max(9999999999.99).multipleOf(0.01),
  ),
  sponsorship_expected: z.boolean(),
  special_requirements: z.string().trim().max(3000),
}).refine(
  (data) => data.start_date !== data.end_date || data.end_time > data.start_time,
  { message: "End time must be after the start time for a single-day event.", path: ["end_time"] },
);

export type EventRequestInput = z.infer<typeof eventRequestSchema>;
