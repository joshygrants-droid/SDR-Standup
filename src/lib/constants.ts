export const TIME_ZONE = "America/Denver";
export const MIN_DIALS = 40;
export const MIN_NEW_PROSPECTS = 10;
export const MANAGER_COOKIE = "manager_auth";

// Daily activity checklist. Reps mark these for the day prior on their standup.
// `key` is the DailyEntry boolean field + the form input name; keeping them
// identical lets the rep form and dashboard stay in sync from one source.
export const CHECKLIST_ITEMS = [
  {
    key: "checkT2Leads",
    label: "Worked all T2 leads and contacts",
    short: "T2 Leads",
  },
  {
    key: "checkRecycledLeads",
    label: "Added recycled leads to their outreach sequence",
    short: "Recycled",
  },
  {
    key: "checkStateRestaurant",
    label:
      "Worked state-specific independent restaurant leads (added to a sequence and called)",
    short: "State Restaurants",
  },
  {
    key: "checkNetNewBrand",
    label:
      "Added 10 net-new brand-specific leads/contacts to outreach (call + email)",
    short: "10 Net-New Brand",
  },
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];
