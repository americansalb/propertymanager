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
  HVAC: "Heating and cooling",
  APPLIANCE: "Appliance",
  DOORS_LOCKS: "Doors and locks",
  PEST: "Pests",
  FLOORING_WALLS: "Floors and walls",
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
  SUBMITTED: "Sent",
  ACKNOWLEDGED: "Seen by your landlord",
  SCHEDULED: "Visit scheduled",
  IN_PROGRESS: "Work started",
  RESOLVED: "Fixed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  SENT_TO_MARKETPLACE: "Finding a pro",
};

/** Landlord-facing status wording (neutral; the tenant sees softer labels). */
export const MAINT_STATUS_LABEL_LANDLORD: Record<string, string> = {
  SUBMITTED: "New",
  ACKNOWLEDGED: "Seen",
  SCHEDULED: "Visit scheduled",
  IN_PROGRESS: "Work started",
  RESOLVED: "Fixed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  SENT_TO_MARKETPLACE: "Out for bids",
};

/** Statuses a landlord can set when responding to a request. */
export const MAINT_LANDLORD_STATUSES = [
  "ACKNOWLEDGED",
  "SCHEDULED",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
] as const;

/** What each stage means, said to the landlord choosing it. */
export const MAINT_STAGE_HELP: Record<string, string> = {
  SUBMITTED: "Nobody has answered yet.",
  ACKNOWLEDGED: "You have read it. Nothing is booked yet.",
  SCHEDULED: "Someone is coming. Say when in the note.",
  IN_PROGRESS: "The repair is under way.",
  RESOLVED: "The problem is solved.",
};

export const maintenanceRespondSchema = z
  .object({
    toStatus: z.enum(MAINT_LANDLORD_STATUSES).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((d) => d.toStatus !== undefined || d.note !== undefined, {
    message: "Add a note or change the status.",
  });

export type MaintenanceRespondInput = z.infer<typeof maintenanceRespondSchema>;

/** Tenant-facing verb phrases for timeline updates (reads naturally). */
export const MAINT_TENANT_UPDATE_VERB: Record<string, string> = {
  ACKNOWLEDGED: "saw your request",
  SCHEDULED: "scheduled a visit",
  IN_PROGRESS: "started work",
  RESOLVED: "marked this fixed",
  CLOSED: "closed this request",
  CANCELLED: "cancelled this request",
  SENT_TO_MARKETPLACE: "is finding a pro",
};
