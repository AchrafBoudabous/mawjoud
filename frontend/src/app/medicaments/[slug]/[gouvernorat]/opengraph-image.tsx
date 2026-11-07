import { ImageResponse } from "next/og";
import { getMedicationStock } from "@/lib/api";
import { formatAbsoluteDateTime } from "@/lib/format";

/** The "status card" Facebook, WhatsApp and Messenger show when someone
 *  shares a medication page — the answer to "chkoun l9a…?" at a glance.
 *  Latin text only: the default OG font has no Arabic glyphs. */
export const alt = "Disponibilité du médicament — Mawjoud";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

type Props = { params: Promise<{ slug: string; gouvernorat: string }> };

const C = {
  bg: "#fbfaf7",
  ink: "#10201d",
  muted: "#5d6b68",
  brand: "#0b7a6a",
  in: "#0f6fb0",
  out: "#c4361f",
  unsure: "#7c3aed",
  none: "#cfd6d3",
  warnBg: "#fff8e6",
  warnText: "#7c4a03",
};

export default async function Image({ params }: Props) {
  const { slug, gouvernorat } = await params;

  let med = "Médicament";
  let generic = "";
  let gov = "";
  let s = { in_stock: 0, out_of_stock: 0, unsure: 0, none: 0 };
  let latest: string | null = null;
  try {
    const data = await getMedicationStock(slug, gouvernorat);
    med = data.medication.name;
    generic = data.medication.generic_name;
    gov = data.governorate.name_fr;
    s = data.summary;
    latest = data.pharmacies.map((p) => p.reported_at).filter((x): x is string => Boolean(x)).sort().at(-1) ?? null;
  } catch {
    /* fall back to a generic card rather than a broken preview */
  }
  const total = s.in_stock + s.out_of_stock + s.unsure + s.none || 1;
  const headline =
    s.in_stock > 0
      ? `Signalé disponible dans ${s.in_stock} pharmacie${s.in_stock > 1 ? "s" : ""}`
      : "Aucune pharmacie ne l'a encore signalé disponible";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, padding: "52px 64px", fontFamily: "sans-serif", color: C.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 40, fontWeight: 800 }}>+</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Mawjoud</div>
          <div style={{ marginLeft: "auto", fontSize: 28, color: C.brand, fontWeight: 700 }}>{gov}</div>
        </div>

        <div style={{ marginTop: 28, fontSize: 64, fontWeight: 800, lineHeight: 1.15, display: "flex" }}>{med}</div>
        <div style={{ marginTop: 14, fontSize: 32, color: C.muted, display: "flex" }}>{generic}</div>

        <div style={{ marginTop: 30, fontSize: 38, fontWeight: 700, display: "flex", color: s.in_stock > 0 ? C.in : C.ink }}>{headline}</div>
        <div style={{ marginTop: 20, display: "flex", width: "100%", height: 22, borderRadius: 11, overflow: "hidden", background: "#eef1f0", gap: 4 }}>
          {([["in_stock", C.in], ["unsure", C.unsure], ["out_of_stock", C.out], ["none", C.none]] as const).map(([k, color]) =>
            s[k] > 0 ? <div key={k} style={{ width: `${(s[k] / total) * 100}%`, background: color, height: "100%" }} /> : null
          )}
        </div>
        <div style={{ marginTop: 14, display: "flex", fontSize: 26, color: C.muted }}>
          {`${s.in_stock} disponible(s)  ·  ${s.out_of_stock} en rupture  ·  ${s.none} sans signalement`}
        </div>
        {latest && (
          <div style={{ marginTop: 6, display: "flex", fontSize: 24, color: C.muted }}>
            {`Dernier signalement : ${formatAbsoluteDateTime(latest)}`}
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", background: C.warnBg, color: C.warnText, borderRadius: 18, padding: "14px 22px", fontSize: 24 }}>
          Informations communautaires, non garanties — appelez la pharmacie avant de vous déplacer.
        </div>
      </div>
    ),
    size
  );
}
