"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagicLinkPrompt } from "@/components/MagicLinkPrompt";
import type { Pharmacy } from "@/lib/api";
import { registerPharmacist } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { classifyRegistrationError, type RegistrationErrorKind } from "@/lib/pharmacist";
import { sendMagicLink } from "@/lib/supabase/auth";
import { BUTTON_BASE, BUTTON_PRIMARY, FIELD } from "@/lib/ui";

type PharmacistRegistrationFormProps = {
  pharmacies: Pharmacy[];
};

type Phase = "idle" | "submitting" | "registered";

export function PharmacistRegistrationForm({ pharmacies }: PharmacistRegistrationFormProps) {
  const dict = getDictionary();

  const [pharmacyId, setPharmacyId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<RegistrationErrorKind | null>(null);

  const groupedByCity = useMemo(() => {
    const groups = new Map<string, Pharmacy[]>();
    for (const pharmacy of pharmacies) {
      const list = groups.get(pharmacy.city) ?? [];
      list.push(pharmacy);
      groups.set(pharmacy.city, list);
    }
    return Array.from(groups.entries());
  }, [pharmacies]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "submitting") return;
    setPhase("submitting");
    setError(null);

    try {
      // 1. FastAPI: validate, rate-limit, insert 'pending'.
      await registerPharmacist({
        pharmacy_id: pharmacyId,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      // 2. Only after 201: trigger the magic-link e-mail. Never call
      // Supabase first — step 2 would create auth users for
      // registrations our own validation later rejects.
      try {
        await sendMagicLink(email.trim(), { createUser: true });
      } catch (linkError) {
        // The account row exists even if the e-mail failed to send. The
        // prompt always offers "resend", so surface it the same way.
        console.error("sendMagicLink after registration failed:", linkError);
      }
      setPhase("registered");
    } catch (err) {
      setError(classifyRegistrationError(err));
      setPhase("idle");
    }
  }

  if (phase === "registered") {
    return <MagicLinkPrompt email={email.trim()} registered />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{dict.pharmacist.register.title}</h1>
        <p className="mt-1 text-sm text-muted">{dict.pharmacist.register.intro}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-pharmacy" className="text-sm font-medium text-ink">
            {dict.pharmacist.register.pharmacyLabel}
          </label>
          <select
            id="register-pharmacy"
            required
            value={pharmacyId}
            onChange={(e) => setPharmacyId(e.target.value)}
            className={FIELD}
          >
            <option value="" disabled>
              {dict.pharmacist.register.pharmacyPlaceholder}
            </option>
            {groupedByCity.map(([city, list]) => (
              <optgroup key={city} label={city}>
                {list.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name} — {pharmacy.address}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-name" className="text-sm font-medium text-ink">
            {dict.pharmacist.register.fullNameLabel}
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-email" className="text-sm font-medium text-ink">
            {dict.pharmacist.register.emailLabel}
          </label>
          <input
            id="register-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-phone" className="text-sm font-medium text-ink">
            {dict.pharmacist.register.phoneLabel}
          </label>
          <input
            id="register-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={FIELD}
          />
          <p className="text-xs text-muted">{dict.pharmacist.register.phoneHint}</p>
        </div>

        <p className="text-xs text-muted">{dict.pharmacist.register.dataNote}</p>
        <p className="text-xs text-muted">
          {dict.pharmacist.register.missingPharmacy(dict.common.contactEmail)}
        </p>

        {error && (
          <div role="alert" className="text-sm text-stock-out">
            <p>{dict.pharmacist.register.errors[error]}</p>
            {error === "email_taken" && (
              <Link href="/pharmacien/connexion" className="underline">
                {dict.pharmacist.login.title}
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={phase === "submitting" || !pharmacyId}
          className={`${BUTTON_BASE} ${BUTTON_PRIMARY} w-full sm:w-auto`}
        >
          {phase === "submitting"
            ? dict.pharmacist.register.submitting
            : dict.pharmacist.register.submit}
        </button>
      </form>
    </div>
  );
}
