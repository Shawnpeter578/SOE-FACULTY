
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
      z.number().finite().min(0).max(999999999999).optional()
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
