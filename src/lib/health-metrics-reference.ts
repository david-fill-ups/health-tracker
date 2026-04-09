import data from "../../data/health-metrics-reference.json";

export interface HealthMetricReference {
  metricType: string;
  aliases: string[];
  description: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export function getMetricReference(metricType: string): HealthMetricReference | undefined {
  const key = normalize(metricType);
  return (data.metrics as HealthMetricReference[]).find(
    (m) =>
      normalize(m.metricType) === key ||
      m.aliases.some((a) => normalize(a) === key)
  );
}
