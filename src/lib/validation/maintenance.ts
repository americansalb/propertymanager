import { z } from "zod";

export const MAINTENANCE_CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "APPLIANCE",
  "DOORS_LOCKS",
  "PEST",
  "FLOORING_WALLS",
  "OTHER",
] as const;

export const MAINTENANCE_URGENCIES = ["EMERGENCY", "URGENT", "NORMAL", "LOW"] as const;

export const maintenanceRequestSchema = z.object({
  category: z.enum(MAINTENANCE_CATEGORIES),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(2000),
  urgency: z.enum(MAINTENANCE_URGENCIES),
  permissionToEnter: z.boolean(),
  accessNotes: z.string().trim().max(500).optional(),
  preferredTimes: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
});

export type MaintenanceRequestInput = z.infer<typeof maintenanceRequestSchema>;

export const CATEGORY_LABEL: Record<(typeof MAINTENANCE_CATEGORIES)[number], string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  HVAC: "Heating & cooling",
  APPLIANCE: "Appliance",
  DOORS_LOCKS: "Doors & locks",
  PEST: "Pests",
  FLOORING_WALLS: "Floors & walls",
  OTHER: "Something else",
};

export const URGENCY_LABEL: Record<(typeof MAINTENANCE_URGENCIES)[number], string> = {
  EMERGENCY: "Emergency",
  URGENT: "Urgent",
  NORMAL: "Normal",
  LOW: "Low",
};

/** Tenant-facing status wording (the raw enum is internal). */
export const MAINT_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Seen by landlord",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  SENT_TO_MARKETPLACE: "Finding a pro",
};
