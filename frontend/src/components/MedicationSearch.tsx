"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import type { MedicationMatch } from "@/lib/api";
import { searchMedications } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { getPreferredGovernorate } from "@/lib/prefs";
import { BUTTON_QUIET } from "@/lib/ui";
import { cn } from "@/lib/utils";

type SearchStatus = "idle" | "loading" | "ready" | "error";

type MedicationSearchProps = {
  /** Rendered above the input. Defaults to dict.search.label. */
  label?: string;
  /** Compact variant used in the results page header (smaller, no help text). */
  compact?: boolean;
  autoFocus?: boolean;
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;

export function MedicationSearch({ label, compact, autoFocus }: MedicationSearchProps) {
  const dict = getDictionary();
  const router = useRouter();
  const uid = useId();
  const inputId = `${uid}-input`;
  const listboxId = `${uid}-listbox`;
  const optionId = (i: number) => `${uid}-option-${i}`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicationMatch[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setStatus("idle");
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setOpen(true);

      searchMedications(trimmed, controller.signal)
        .then((data) => {
          setResults(data.medications);
          setStatus("ready");
          setActiveIndex(0);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Medication search failed:", error);
          setStatus("error");
          setOpen(true);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Abort a still-running request when the component unmounts (e.g. the
  // user navigated away mid-typing), so its callbacks never fire.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectMedication(match: MedicationMatch) {
    setOpen(false);
    // Returning users land straight on their governorate; first-timers
    // get the national overview and pick one there.
    const gov = getPreferredGovernorate();
    router.push(gov ? `/medicaments/${match.slug}/${gov}` : `/medicaments/${match.slug}`);
  }

  function clear() {
    setQuery("");
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!open || results.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      if (!open || results.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (!open || results.length === 0) return;
      event.preventDefault();
      const match = results[activeIndex];
      if (match) selectMedication(match);
    } else if (event.key === "Escape") {
      if (open) setOpen(false);
      else if (query) setQuery("");
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className={cn("mb-2 block text-sm font-semibold text-ink", compact && "sr-only")}
      >
        {label ?? dict.search.label}
      </label>

      <div
        className={cn(
          "group relative flex items-center border bg-surface transition-[border-color,box-shadow] duration-200 ease-standard",
          "focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15",
          // Radius lives in each branch: tailwind-merge does not know the
          // custom radius names, so two of them must never be combined.
          compact
            ? "h-12 rounded-field border-line shadow-card"
            : "h-16 rounded-panel border-line-strong/70 shadow-raised md:h-[4.25rem]"
        )}
      >
        <Icon
          name="search"
          className={cn(
            "pointer-events-none absolute left-4 shrink-0 text-muted transition-colors group-focus-within:text-brand-600",
            compact ? "size-[1.125rem]" : "size-5"
          )}
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && results.length ? optionId(activeIndex) : undefined}
          autoComplete="off"
          autoCorrect="off"
          dir="auto"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          maxLength={64}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (status !== "idle") setOpen(true);
          }}
          placeholder={dict.search.placeholder}
          className={cn(
            "h-full w-full min-w-0 rounded-[inherit] bg-transparent pr-28 text-ink placeholder:text-muted focus:outline-none",
            compact ? "pl-11 text-base" : "pl-12 text-lg"
          )}
        />
        <div className="absolute right-2 flex items-center">
          {status === "loading" ? (
            <Icon name="loader" className="mx-2.5 size-5 animate-spin text-brand-600" />
          ) : query ? (
            <button
              type="button"
              onClick={clear}
              aria-label={dict.search.clear}
              className="pressable flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="x" className="size-4" />
            </button>
          ) : null}
          <VoiceSearchButton
            onStatus={setVoiceStatus}
            onTranscript={(text) => {
              setVoiceStatus(null);
              setQuery(text);
              inputRef.current?.focus();
            }}
          />
        </div>
      </div>

      {voiceStatus ? (
        <p role="status" className="mt-2 px-1 text-xs font-medium text-brand-700">
          {voiceStatus}
        </p>
      ) : (
        !compact && <p className="mt-2 px-1 text-xs text-muted">{dict.search.hint}</p>
      )}

      <ul
        id={listboxId}
        role="listbox"
        aria-label={dict.search.listboxLabel}
        hidden={!open}
        className="absolute z-[1000] mt-2 max-h-96 w-full overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-float animate-fade-in-up"
      >
        {status === "loading" &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} aria-hidden="true" className="flex items-center gap-3 px-3 py-2.5">
              <div className="size-9 animate-pulse-soft rounded-control bg-skeleton" />
              <div className="flex-1">
                <div className="h-4 w-1/2 animate-pulse-soft rounded-field bg-skeleton" />
                <div className="mt-1.5 h-3.5 w-3/4 animate-pulse-soft rounded-field bg-skeleton" />
              </div>
            </li>
          ))}
        {status === "error" && (
          <li className="flex items-start gap-2 px-3 py-3 text-sm text-warn-text">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
            {dict.search.error}
          </li>
        )}
        {status === "ready" && results.length === 0 && (
          <li className="px-3 py-4">
            <p className="text-sm font-semibold text-ink">{dict.search.noResults(query.trim())}</p>
            <p className="mt-1 text-xs text-muted">{dict.search.noResultsHint}</p>
            {/* Absolute: the anchor only exists on the home page. */}
            <Link href="/#medicaments-suivis" className={cn("mt-1", BUTTON_QUIET)}>
              {dict.search.noResultsCta}
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </li>
        )}
        {status === "ready" &&
          results.map((match, i) => (
            <li
              key={match.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectMedication(match)}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-3 py-2 transition-colors duration-100",
                i === activeIndex ? "bg-brand-50" : ""
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                <Icon name={match.category} className="size-[1.125rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{match.name}</span>
                <span className="block truncate text-sm text-muted">
                  {match.generic_name}
                  {match.form ? ` · ${match.form}` : ""}
                </span>
              </span>
              <Icon
                name="arrow-right"
                className={cn(
                  "size-4 shrink-0 text-brand-600 transition-[opacity,transform] duration-150",
                  i === activeIndex ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                )}
              />
            </li>
          ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {status === "loading"
          ? dict.search.searching
          : status === "ready"
            ? dict.search.resultCount(results.length)
            : ""}
      </p>
    </div>
  );
}
