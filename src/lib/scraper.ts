import { decideProjectGate, scoreToStars } from "./rules";
import { procurementSections } from "./taxonomy";

export async function runProcurementCycle() {
  // Production connector boundary: concrete source adapters should fetch official APIs/RSS/PDF pages,
  // normalize candidates, verify links, then pass records through these gates before insertion.
  const now = new Date().toISOString();
  const sample = procurementSections.map((section, index) => ({
    id: `${section.key}-${now}`,
    section: section.label,
    status: decideProjectGate({ isInternationalOpen: true, chinaEligible: null, amountUsd: 30_000_000, deadline: new Date(Date.now() + 86400000 * (index + 10)).toISOString(), officialLinkValid: true, authentic: true }),
    score: 80 - index * 10,
    stars: scoreToStars(80 - index * 10),
  }));
  return { startedAt: now, scannedSources: 0, inserted: 0, pendingReview: sample.length, records: sample };
}
