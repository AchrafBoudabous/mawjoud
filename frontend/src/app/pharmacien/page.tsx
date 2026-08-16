import type { Metadata } from "next";
import { PharmacistDashboard } from "@/components/PharmacistDashboard";

export const metadata: Metadata = { title: "Tableau de bord — Mawjoud" };

// No `revalidate`, no server fetch: per-user data cannot be ISR-cached.
// Scoped exception to decision 2.12.9 — see docs/ARCHITECTURE.md 5.18.6.
export default function PharmacienPage() {
  return <PharmacistDashboard />;
}
