-- Daily activity checklist (marked by rep for the day prior)
ALTER TABLE "DailyEntry" ADD COLUMN     "checkT2Leads" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyEntry" ADD COLUMN     "checkRecycledLeads" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyEntry" ADD COLUMN     "checkStateRestaurant" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyEntry" ADD COLUMN     "checkNetNewBrand" BOOLEAN NOT NULL DEFAULT false;
