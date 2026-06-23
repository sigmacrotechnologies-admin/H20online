export const WATER_QUALITY_OPTIONS = [
  { key: "standard", label: "Standard", description: "Municipal treated water" },
  { key: "purified", label: "Purified", description: "Filtered & treated" },
  { key: "ro", label: "RO Water", description: "Reverse osmosis" },
  { key: "mineral", label: "Mineral", description: "Enhanced minerals" },
];

export function getWaterQualityLabel(key) {
  const match = WATER_QUALITY_OPTIONS.find((o) => o.key === key);
  return match ? match.label : key || "—";
}
