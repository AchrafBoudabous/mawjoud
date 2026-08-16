import type { Metadata } from "next";
import { PharmacistLoginForm } from "@/components/PharmacistLoginForm";

export const metadata: Metadata = {
  title: "Connexion pharmacien — Mawjoud",
};

export default function PharmacienConnexionPage() {
  return <PharmacistLoginForm />;
}
