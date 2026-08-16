"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MedicationMatch } from "@/lib/api";
import { searchMedications } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

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

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicationMatch[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
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
    router.push(`/medicaments/${match.slug}`);
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
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const listboxId = "medication-search-listbox";
  const inputId = "medication-search";

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink">
        {label ?? dict.search.label}
      </label>
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results.length ? `medication-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (status !== "idle") setOpen(true);
        }}
        placeholder={dict.search.placeholder}
        className="h-12 w-full rounded-md border border-gray-200 bg-surface px-3 text-base text-ink"
      />
      {!compact && <p className="mt-1 text-xs text-muted">{dict.search.hint}</p>}

      <ul
        id={listboxId}
        role="listbox"
        aria-label={dict.search.listboxLabel}
        hidden={!open}
        className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-gray-200 bg-surface shadow-sm"
      >
        {status === "loading" && (
          <li className="px-3 py-3 text-sm text-muted">{dict.search.searching}</li>
        )}
        {status === "error" && (
          <li className="px-3 py-3 text-sm text-warn-text">{dict.search.error}</li>
        )}
        {status === "ready" && results.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted">
            <p>{dict.search.noResults(query.trim())}</p>
            <p className="mt-1">{dict.search.noResultsHint}</p>
          </li>
        )}
        {status === "ready" &&
          results.map((match, i) => (
            <li
              key={match.id}
              id={`medication-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectMedication(match)}
              className={`min-h-11 cursor-pointer px-3 py-2 ${
                i === activeIndex ? "bg-brand-50" : ""
              }`}
            >
              <p className="font-medium text-ink">{match.name}</p>
              <p className="text-sm text-muted">
                {match.generic_name}
                {match.form ? ` · ${match.form}` : ""}
              </p>
            </li>
          ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {status === "ready" ? dict.search.resultCount(results.length) : ""}
      </p>
    </div>
  );
}
