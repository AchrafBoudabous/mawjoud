"""Build supabase/seed_osm_pharmacies.sql from an OpenStreetMap extract.

Usage (from the repo root):

    python -m venv .osm-venv
    .osm-venv/Scripts/pip install -r scripts/requirements.txt   # or bin/pip
    curl -L -o tunisia-latest.osm.pbf https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
    .osm-venv/Scripts/python scripts/import_osm_pharmacies.py tunisia-latest.osm.pbf

Then apply supabase/seed_osm_pharmacies.sql in the Supabase SQL editor
(after every migration). Re-running is safe: rows are upserted on
osm_ref, and `verified` / pharmacist links are never touched.

Data © OpenStreetMap contributors, ODbL 1.0
(https://www.openstreetmap.org/copyright). The map already shows the
required attribution; keep it if the UI changes.

Every row is unverified community data. A pharmacy appears here because
OSM says it exists — not because Mawjoud checked it.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path

import osmium
import shapely
from shapely import wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

# ISO 3166-2 code -> governorate slug (must match public.governorates).
ISO_TO_SLUG = {
    "TN-11": "tunis", "TN-12": "ariana", "TN-13": "ben-arous", "TN-14": "manouba",
    "TN-21": "nabeul", "TN-22": "zaghouan", "TN-23": "bizerte", "TN-31": "beja",
    "TN-32": "jendouba", "TN-33": "le-kef", "TN-34": "siliana", "TN-41": "kairouan",
    "TN-42": "kasserine", "TN-43": "sidi-bouzid", "TN-51": "sousse", "TN-52": "monastir",
    "TN-53": "mahdia", "TN-61": "sfax", "TN-71": "gafsa", "TN-72": "tozeur",
    "TN-73": "kebili", "TN-81": "gabes", "TN-82": "medenine", "TN-83": "tataouine",
}

PLACE_TYPES = {"city", "town", "village", "suburb", "quarter", "neighbourhood"}
ARABIC = re.compile(r"[؀-ۿ]")
# "Pharmacie de nuit" is the Tunisian night pharmacy: open all night,
# every night. OSM rarely carries opening_hours for them, but the name
# says it.
NIGHT_NAME = re.compile(r"\bde\s+nuit\b|\bnight\b|ليلي", re.IGNORECASE)
NAMESPACE = uuid.UUID("6f1c2b7e-3d4a-5b6c-8d9e-0a1b2c3d4e5f")


# --- Same rules as backend/app/services/phone.py --------------------------
def normalise_tn_phone(raw: str) -> str | None:
    cleaned = re.sub(r"[^0-9+]", "", raw.strip())
    if not cleaned or cleaned.count("+") > 1 or ("+" in cleaned and not cleaned.startswith("+")):
        return None
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if cleaned.startswith("+216"):
        national = cleaned[4:]
    elif cleaned.startswith("216"):
        national = cleaned[3:]
    elif cleaned.startswith("+"):
        return None
    else:
        national = cleaned
    return f"+216{national}" if re.fullmatch(r"[0-9]{8}", national) else None


def first_phone(tags: dict[str, str]) -> str | None:
    for key in ("phone", "contact:phone", "phone:mobile", "contact:mobile"):
        for part in re.split(r"[;,/]", tags.get(key, "")):
            phone = normalise_tn_phone(part)
            if phone:
                return phone
    return None


@dataclass
class Pharmacy:
    ref: str
    lat: float
    lng: float
    tags: dict[str, str]


class Collector(osmium.SimpleHandler):
    def __init__(self) -> None:
        super().__init__()
        self.wkb = osmium.geom.WKBFactory()
        self.boundaries: dict[str, shapely.Geometry] = {}
        self.pharmacies: list[Pharmacy] = []
        self.places: list[tuple[Point, str, str]] = []

    @staticmethod
    def _is_pharmacy(tags) -> bool:
        return tags.get("amenity") == "pharmacy" or tags.get("healthcare") == "pharmacy"

    def node(self, n) -> None:
        if self._is_pharmacy(n.tags):
            self.pharmacies.append(
                Pharmacy(f"node/{n.id}", n.location.lat, n.location.lon, dict(n.tags))
            )
        place = n.tags.get("place")
        if place in PLACE_TYPES:
            name = n.tags.get("name:fr") or n.tags.get("name")
            if name:
                self.places.append((Point(n.location.lon, n.location.lat), name, place))

    def area(self, a) -> None:
        tags = a.tags
        iso = tags.get("ISO3166-2", "")
        try:
            if tags.get("admin_level") == "4" and iso in ISO_TO_SLUG:
                geom = wkb.loads(self.wkb.create_multipolygon(a), hex=True)
                prev = self.boundaries.get(iso)
                self.boundaries[iso] = geom if prev is None else prev.union(geom)
            elif self._is_pharmacy(tags):
                geom = wkb.loads(self.wkb.create_multipolygon(a), hex=True)
                c = geom.representative_point()
                kind = "way" if a.from_way() else "relation"
                self.pharmacies.append(Pharmacy(f"{kind}/{a.orig_id()}", c.y, c.x, dict(tags)))
        except RuntimeError:
            # Broken multipolygon in OSM — skip it rather than abort.
            pass


def sql(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


_LOWER_WORDS = {"de", "du", "des", "la", "le", "les", "el", "et", "d'", "l'", "ben", "bou"}


def tame_caps(value: str) -> str:
    """'PHARMACIE MENDES FRANCE' -> 'Pharmacie Mendes France'. Only for
    names typed entirely in capitals; anything mixed-case is the
    mapper's choice and is kept."""
    if not value.isupper() or ARABIC.search(value):
        return value
    words = value.lower().split(" ")
    return " ".join(w if (i and w in _LOWER_WORDS) else w[:1].upper() + w[1:] for i, w in enumerate(words))


def clean(value: str | None, limit: int = 160) -> str | None:
    if not value:
        return None
    value = re.sub(r"\s+", " ", value).strip()
    return value[:limit] or None


def build_rows(c: Collector) -> list[dict]:
    gov_items = list(c.boundaries.items())
    missing = set(ISO_TO_SLUG) - set(c.boundaries)
    if missing:
        print(f"warning: no boundary found for {sorted(missing)}", file=sys.stderr)
    gov_tree = STRtree([g for _, g in gov_items])
    place_tree = STRtree([p for p, _, _ in c.places]) if c.places else None

    rows: list[dict] = []
    seen: set[str] = set()
    for ph in c.pharmacies:
        if ph.ref in seen:
            continue
        seen.add(ph.ref)
        if not (30 <= ph.lat <= 38 and 7 <= ph.lng <= 12):
            continue
        pt = Point(ph.lng, ph.lat)

        iso = None
        for idx in gov_tree.query(pt, predicate="intersects"):
            iso = gov_items[int(idx)][0]
            break
        if iso is None:  # coastline / boundary slivers: nearest within ~5 km
            idx = gov_tree.nearest(pt)
            if idx is not None and gov_items[int(idx)][1].distance(pt) < 0.05:
                iso = gov_items[int(idx)][0]
        if iso is None:
            continue

        t = ph.tags
        locality = None
        if place_tree is not None:
            idx = place_tree.nearest(pt)
            if idx is not None and c.places[int(idx)][0].distance(pt) < 0.1:
                locality = c.places[int(idx)][1]

        raw_name = t.get("name:fr") or t.get("name") or t.get("name:ar")
        name = tame_caps(clean(raw_name) or "") or (f"Pharmacie — {locality}" if locality else "Pharmacie")
        name_ar = clean(t.get("name:ar")) or (clean(t.get("name")) if ARABIC.search(t.get("name", "")) else None)

        street = clean(t.get("addr:street"))
        number = clean(t.get("addr:housenumber"), 20)
        city = clean(t.get("addr:city")) or locality
        if street:
            address = f"{number} {street}" if number else street
        else:
            address = clean(t.get("addr:full")) or (f"{locality}" if locality else None)
        if not address:
            address = f"Près de {ph.lat:.4f}, {ph.lng:.4f}"
        city = city or address

        rows.append(
            {
                "id": str(uuid.uuid5(NAMESPACE, ph.ref)),
                "osm_ref": ph.ref,
                "name": name,
                "name_ar": name_ar if name_ar != name else None,
                "address": address,
                "city": city,
                "governorate_slug": ISO_TO_SLUG[iso],
                "lat": round(ph.lat, 6),
                "lng": round(ph.lng, 6),
                "phone": first_phone(t),
                "is_24h": (
                    t.get("opening_hours", "").strip().lower() in {"24/7", "mo-su 00:00-24:00"}
                    or bool(NIGHT_NAME.search(" ".join(filter(None, [raw_name, t.get("name:ar")]))))
                ),
            }
        )
    rows.sort(key=lambda r: (r["governorate_slug"], r["name"]))
    return rows


def write_sql(rows: list[dict], out: Path, source_name: str) -> None:
    today = dt.date.today().isoformat()
    lines = [
        "-- supabase/seed_osm_pharmacies.sql — GENERATED, do not edit by hand.",
        f"-- Built {today} by scripts/import_osm_pharmacies.py from {source_name}.",
        "-- Data © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright",
        f"-- {len(rows)} pharmacies. Apply AFTER every migration. Idempotent.",
        "",
        "begin;",
        "",
        "-- Retire the fictional step-2 demo rows (and their demo reports),",
        "-- except any a pharmacist account is attached to.",
        "delete from public.pharmacies p",
        " where p.source = 'demo'",
        "   and not exists (select 1 from public.pharmacist_accounts a where a.pharmacy_id = p.id);",
        "",
    ]
    cols = "(id, osm_ref, name, name_ar, address, city, governorate_slug, lat, lng, phone, is_24h, source, verified)"
    for start in range(0, len(rows), 250):
        chunk = rows[start : start + 250]
        values = ",\n".join(
            "  ({id}, {osm_ref}, {name}, {name_ar}, {address}, {city}, {gov}, {lat}, {lng}, {phone}, {h24}, 'osm', false)".format(
                id=sql(r["id"]), osm_ref=sql(r["osm_ref"]), name=sql(r["name"]),
                name_ar=sql(r["name_ar"]), address=sql(r["address"]), city=sql(r["city"]),
                gov=sql(r["governorate_slug"]), lat=f"{r['lat']:.6f}", lng=f"{r['lng']:.6f}",
                phone=sql(r["phone"]), h24="true" if r["is_24h"] else "false",
            )
            for r in chunk
        )
        lines += [
            f"insert into public.pharmacies {cols}",
            "values",
            values,
            "on conflict (osm_ref) where osm_ref is not null do update set",
            "  name = excluded.name, name_ar = excluded.name_ar, address = excluded.address,",
            "  city = excluded.city, governorate_slug = excluded.governorate_slug,",
            "  lat = excluded.lat, lng = excluded.lng,",
            "  phone = coalesce(excluded.phone, public.pharmacies.phone),",
            "  is_24h = excluded.is_24h",
            "-- Once an admin has approved a pharmacist for this pharmacy, OSM",
            "-- edits can no longer change it (an attacker could otherwise edit",
            "-- the phone or address on OpenStreetMap and wait for an import).",
            "where not public.pharmacies.verified;",
            "",
        ]
    lines += ["commit;", ""]
    out.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pbf", type=Path, help="Geofabrik tunisia-latest.osm.pbf")
    parser.add_argument("--out", type=Path, default=Path("supabase/seed_osm_pharmacies.sql"))
    args = parser.parse_args()

    collector = Collector()
    collector.apply_file(str(args.pbf), locations=True)
    rows = build_rows(collector)
    write_sql(rows, args.out, args.pbf.name)

    per_gov: dict[str, int] = {}
    for r in rows:
        per_gov[r["governorate_slug"]] = per_gov.get(r["governorate_slug"], 0) + 1
    print(f"{len(rows)} pharmacies -> {args.out}")
    print(f"  with phone: {sum(1 for r in rows if r['phone'])}, open at night: {sum(1 for r in rows if r['is_24h'])}")
    for slug in sorted(per_gov, key=lambda s: -per_gov[s]):
        print(f"  {slug:12s} {per_gov[slug]}")


if __name__ == "__main__":
    main()
    # Everything is written and flushed by now. Tearing down osmium's
    # country-sized location index can take minutes on exit; skip it.
    sys.stdout.flush()
    os._exit(0)
