"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Minimal typing for the Web Speech API (not in TS's DOM lib yet).
type SpeechRecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Lang = "fr-FR" | "ar-TN";

/**
 * Speak the medication name in French or Tunisian Arabic. Hidden where the
 * browser has no speech recognition. The transcript fills the search box;
 * the fuzzy + Arabic-aware search does the rest. Audio is processed by the
 * browser (on Chrome, by Google) — never by Mawjoud — and the UI says so.
 */
export function VoiceSearchButton({
  onTranscript,
  onStatus,
}: {
  onTranscript: (text: string) => void;
  onStatus: (message: string | null) => void;
}) {
  const dict = getDictionary();
  const t = dict.voice;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<Lang>("fr-FR");
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(getRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text.slice(0, 64));
    };
    rec.onerror = (e) => {
      onStatus(e.error === "not-allowed" || e.error === "service-not-allowed" ? t.denied : null);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setListening(true);
    onStatus(`${t.listening} ${t.privacy}`);
    try {
      rec.start();
    } catch {
      setListening(false);
      onStatus(t.unsupported);
    }
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => setLang((l) => (l === "fr-FR" ? "ar-TN" : "fr-FR"))}
        aria-label={`${t.langSwitch} : ${lang === "fr-FR" ? "français" : "arabe tunisien"}`}
        className="pressable flex h-8 min-w-9 items-center justify-center rounded-full px-1.5 text-xs font-bold text-muted hover:bg-surface-2 hover:text-ink"
      >
        {lang === "fr-FR" ? t.langFr : t.langAr}
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? t.stop : t.start}
        className={cn(
          "pressable relative flex size-10 items-center justify-center rounded-full",
          listening ? "bg-stock-out text-white" : "text-brand-700 hover:bg-brand-50"
        )}
      >
        {listening && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-stock-out animate-ping-soft" />}
        <Icon name={listening ? "mic-off" : "mic"} className="relative size-[1.125rem]" />
      </button>
    </div>
  );
}
