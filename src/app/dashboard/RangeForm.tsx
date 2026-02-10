"use client";

import { useState } from "react";
import { getPresetRange } from "@/lib/date";

type RangeValue = "yesterday" | "today" | "week" | "month" | "custom";

type RangeFormProps = {
  range: string;
  start: string;
  end: string;
  metric: string;
};

function normalizeRange(value: string): RangeValue {
  if (
    value === "yesterday" ||
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "custom"
  ) {
    return value;
  }
  return "week";
}

export default function RangeForm({ range, start, end, metric }: RangeFormProps) {
  const [selectedRange, setSelectedRange] = useState<RangeValue>(
    normalizeRange(range),
  );
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  const handleStartChange = (value: string) => {
    setStartDate(value);
    if (selectedRange !== "custom") {
      setSelectedRange("custom");
    }
  };

  const handleEndChange = (value: string) => {
    setEndDate(value);
    if (selectedRange !== "custom") {
      setSelectedRange("custom");
    }
  };

  const handleRangeChange = (value: string) => {
    const nextRange = normalizeRange(value);
    setSelectedRange(nextRange);
    if (nextRange !== "custom") {
      const preset = getPresetRange(nextRange);
      setStartDate(preset.start);
      setEndDate(preset.end);
    }
  };

  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Range
        <select
          name="range"
          value={selectedRange}
          onChange={(event) => handleRangeChange(event.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="yesterday">Yesterday</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Start
        <input
          type="date"
          name="start"
          value={startDate}
          onChange={(event) => handleStartChange(event.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        End
        <input
          type="date"
          name="end"
          value={endDate}
          onChange={(event) => handleEndChange(event.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Leaderboard Metric
        <select
          name="metric"
          defaultValue={metric}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="dials">Dials</option>
          <option value="setsTotal">Total Sets</option>
          <option value="setsNewBiz">New Biz Sets</option>
          <option value="setsExpansion">Upsell Sets</option>
          <option value="sqos">SQOs</option>
          <option value="prospects">New Prospects Added</option>
        </select>
      </label>
      <button
        type="submit"
        className="accent-button rounded-lg px-4 py-2 text-sm font-semibold"
      >
        Apply
      </button>
    </form>
  );
}
