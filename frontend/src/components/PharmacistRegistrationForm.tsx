"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { LocationPicker, type LatLngValue } from "@/components/LocationPicker";
import { MagicLinkPrompt } from "@/components/MagicLinkPrompt";
import { Icon } from "@/components/ui/Icon";
import type { Governorate, Pharmacy } from "@/lib/api";
import { getPharmacies, registerPharmacist } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { classifyRegistrationError, type RegistrationErrorKind } from "@/lib/pharmacist";
import { sendMagicLink } from "@/lib/supabase/auth";
import { BUTTON_BASE, BUTTON_PRIMARY, CARD, FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

type PharmacistRegistrationFormProps = {
  governorates: Governorate[];
};

type Phase = "idle" | "submitting" | "registered";

const NOT_LISTED = "__not_listed__";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.ceil(bytes / 1024)} Ko`;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PharmacistRegistrationForm({ governorates }: PharmacistRegistrationFormProps) {
  const dict = getDictionary();
  const t = dict.pharmacist.register;
  const id = useId();
  const ids = {
    gov: `${id}-gov`, pharmacy: `${id}-ph`, name: `${id}-name`, email: `${id}-email`, phone: `${id}-phone`,
    newName: `${id}-nn`, newAddress: `${id}-na`, newCity: `${id}-nc`, newPhone: `${id}-np`, cert: `${id}-cert`,
  };

  const [governorate, setGovernorate] = useState("");
  const [pharmacies, setPharmacies] = useState<Pharmacy[] | null>(null);
  const [listState, setListState] = useState<"idle" | "loading" | "error">("idle");
  const [pharmacyId, setPharmacyId] = useState("");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [location, setLocation] = useState<LatLngValue | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [linkFailed, setLinkFailed] = useState(false);
  const [error, setError] = useState<RegistrationErrorKind | "location" | null>(null);

  const notListed = pharmacyId === NOT_LISTED;
  const gov = governorates.find((g) => g.slug === governorate) ?? null;

  // One governorate at a time: the national list is never shipped whole.
  useEffect(() => {
    if (!governorate) return;
    const controller = new AbortController();
    setListState("loading");
    setPharmacies(null);
    setPharmacyId("");
    setLocation(null);
    getPharmacies(governorate, { signal: controller.signal })
      .then((data) => {
        setPharmacies(data.pharmacies);
        setListState("idle");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load pharmacies for registration:", err);
        setListState("error");
      });
    return () => controller.abort();
  }, [governorate]);

  const groupedByCity = (() => {
    const groups = new Map<string, Pharmacy[]>();
    for (const p of pharmacies ?? []) {
      const list = groups.get(p.city) ?? [];
      list.push(p);
      groups.set(p.city, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "fr"));
  })();

  function chooseFile(file: File | null) {
    setCertError(null);
    setCertificate(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setCertError(t.certificateBadType);
      return;
    }
    if (file.size > MAX_BYTES) {
      setCertError(t.certificateTooBig);
      return;
    }
    setCertificate(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "submitting" || !certificate) return;
    if (notListed && !location) {
      setError("location");
      return;
    }
    setPhase("submitting");
    setError(null);

    try {
      // 1. FastAPI: certificate + request, created 'pending' for review.
      await registerPharmacist({
        pharmacy_id: notListed ? null : pharmacyId,
        new_pharmacy:
          notListed && location
            ? {
                name: newName.trim(),
                address: newAddress.trim(),
                city: newCity.trim(),
                governorate_slug: governorate,
                lat: location.lat,
                lng: location.lng,
                phone: newPhone.trim() || null,
              }
            : null,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        certificate,
      });
      // 2. Only after 201: the sign-in e-mail. The login user was already
      // created by the API, so this never creates users itself.
      try {
        await sendMagicLink(email.trim(), { createUser: false });
      } catch (linkError) {
        console.error("sendMagicLink after registration failed:", linkError);
        setLinkFailed(true);
      }
      setPhase("registered");
    } catch (err) {
      setError(classifyRegistrationError(err));
      setPhase("idle");
    }
  }

  if (phase === "registered") {
    return <MagicLinkPrompt email={email.trim()} registered sendFailed={linkFailed} />;
  }

  const canSubmit =
    phase !== "submitting" && Boolean(governorate) && Boolean(pharmacyId) && Boolean(certificate);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">{t.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.intro}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field id={ids.gov} label={t.governorateLabel}>
          <select id={ids.gov} required value={governorate} onChange={(e) => setGovernorate(e.target.value)} className={FIELD}>
            <option value="" disabled>{t.governoratePlaceholder}</option>
            {governorates.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name_fr} — {g.name_ar}</option>
            ))}
          </select>
        </Field>

        <Field id={ids.pharmacy} label={t.pharmacyLabel}>
          <select
            id={ids.pharmacy}
            required
            disabled={!governorate || listState !== "idle" || !pharmacies}
            value={pharmacyId}
            onChange={(e) => setPharmacyId(e.target.value)}
            className={FIELD}
          >
            <option value="" disabled>{listState === "loading" ? t.pharmaciesLoading : t.pharmacyPlaceholder}</option>
            {groupedByCity.map(([city, list]) => (
              <optgroup key={city} label={city}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
                ))}
              </optgroup>
            ))}
            <option value={NOT_LISTED}>➕ {t.notListed}</option>
          </select>
          {listState === "error" && <p role="alert" className="text-sm text-stock-out">{t.pharmaciesError}</p>}
        </Field>

        {notListed && gov && (
          <fieldset className={cn(CARD, "flex flex-col gap-4 p-4 animate-fade-in")}>
            <legend className="px-1 text-sm font-bold text-ink">{t.newPharmacyTitle}</legend>
            <p className="-mt-2 text-xs text-muted">{t.newPharmacyHint}</p>
            <Field id={ids.newName} label={t.newNameLabel}>
              <input id={ids.newName} required minLength={2} maxLength={160} value={newName} onChange={(e) => setNewName(e.target.value)} className={FIELD} />
            </Field>
            <Field id={ids.newAddress} label={t.newAddressLabel}>
              <input id={ids.newAddress} required minLength={2} maxLength={160} autoComplete="street-address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className={FIELD} />
            </Field>
            <Field id={ids.newCity} label={t.newCityLabel}>
              <input id={ids.newCity} required minLength={2} maxLength={160} value={newCity} onChange={(e) => setNewCity(e.target.value)} className={FIELD} />
            </Field>
            <Field id={ids.newPhone} label={t.newPhoneLabel}>
              <input id={ids.newPhone} type="tel" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={FIELD} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">{t.locationLabel}</span>
              <LocationPicker center={[gov.lat, gov.lng]} value={location} onChange={(v) => { setLocation(v); setError(null); }} />
              {error === "location" && <p role="alert" className="text-sm text-stock-out">{t.locationMissing}</p>}
            </div>
          </fieldset>
        )}

        <Field id={ids.cert} label={t.certificateLabel} hint={t.certificateHint}>
          <label
            htmlFor={ids.cert}
            className={cn(
              "flex min-h-20 cursor-pointer items-center gap-3 rounded-card border-2 border-dashed px-4 py-3 transition-colors",
              certificate ? "border-brand-300 bg-brand-50" : "border-line-strong bg-surface hover:border-brand-300"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-brand-600 shadow-card">
              <Icon name={certificate ? "check-circle" : "download"} className={cn("size-5", !certificate && "rotate-180")} />
            </span>
            <span className="min-w-0 text-sm">
              {certificate ? (
                <span className="block truncate font-semibold text-ink">{t.certificateChosen(certificate.name, formatSize(certificate.size))}</span>
              ) : (
                <span className="font-semibold text-brand-700">{t.certificateLabel}</span>
              )}
            </span>
          </label>
          <input
            id={ids.cert}
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
          {certError && <p role="alert" className="text-sm text-stock-out">{certError}</p>}
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <Icon name="shield-check" className="mt-px size-3.5 shrink-0" />
            {t.certificatePrivacy}
          </p>
        </Field>

        <Field id={ids.name} label={t.fullNameLabel}>
          <input id={ids.name} type="text" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={FIELD} />
        </Field>

        <Field id={ids.email} label={t.emailLabel} hint={t.emailHint}>
          <input id={ids.email} type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
        </Field>

        <Field id={ids.phone} label={t.phoneLabel} hint={t.phoneHint}>
          <input id={ids.phone} type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD} />
        </Field>

        <p className="text-xs text-muted">{t.dataNote}</p>

        {error && error !== "location" && (
          <div role="alert" className="text-sm text-stock-out">
            <p>{t.errors[error]}</p>
            {(error === "email_taken" || error === "pharmacy_taken") && (
              <Link href="/pharmacien/connexion" className="underline">{dict.pharmacist.login.title}</Link>
            )}
          </div>
        )}

        <button type="submit" disabled={!canSubmit} className={`${BUTTON_BASE} ${BUTTON_PRIMARY} w-full sm:w-auto`}>
          {phase === "submitting" ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
}
