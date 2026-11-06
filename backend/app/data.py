"""Loads the synthetic case dataset once and exposes typed, indexed views of it."""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

import pandas as pd

from .config import get_settings


@dataclass(frozen=True)
class Product:
    id: str
    category: str
    name: str
    description: str
    unit: str
    price_min: int
    price_max: int
    setup_fee: int
    min_contract_months: int
    city_tiers: frozenset[int]
    min_employees: int
    min_sites: int
    requires_gstin: bool
    requires_one_of: tuple[str, ...]
    install_days: int
    target_segments: frozenset[str]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "category": self.category,
            "name": self.name,
            "description": self.description,
            "unit": self.unit,
            "price_min": self.price_min,
            "price_max": self.price_max,
            "setup_fee": self.setup_fee,
            "min_contract_months": self.min_contract_months,
            "city_tiers": sorted(self.city_tiers),
            "min_employees": self.min_employees,
            "min_sites": self.min_sites,
            "requires_gstin": self.requires_gstin,
            "requires_one_of": list(self.requires_one_of),
            "install_days": self.install_days,
            "target_segments": sorted(self.target_segments),
        }


SEGMENT_CODES = {
    "Micro retail & services": "micro",
    "Professional offices": "prof",
    "Small multi-site businesses": "multi",
    "Small manufacturers": "mfg",
}
SEGMENT_NAMES = {v: k for k, v in SEGMENT_CODES.items()}


@dataclass
class Dataset:
    products: dict[str, Product]
    gstin: pd.DataFrame
    udyam: pd.DataFrame
    leads: pd.DataFrame
    city_tier: dict[str, int] = field(default_factory=dict)
    city_state: dict[str, str] = field(default_factory=dict)
    business_segment: dict[str, str] = field(default_factory=dict)


def _parse_products(df: pd.DataFrame) -> dict[str, Product]:
    products: dict[str, Product] = {}
    for r in df.fillna("").to_dict("records"):
        products[r["product_id"]] = Product(
            id=r["product_id"],
            category=r["category"],
            name=r["product_name"],
            description=r["description"],
            unit=r["unit"],
            price_min=int(r["price_min_inr_per_month"]),
            price_max=int(r["price_max_inr_per_month"]),
            setup_fee=int(r["one_time_setup_inr"]),
            min_contract_months=int(r["min_contract_months"]),
            city_tiers=frozenset(int(t) for t in str(r["available_city_tiers"]).split(";") if t),
            min_employees=int(r["min_employees"]),
            min_sites=int(r["min_sites"]),
            requires_gstin=str(r["requires_gstin"]).upper() == "Y",
            requires_one_of=tuple(p for p in str(r["requires_one_of"]).split("|") if p),
            install_days=int(r["typical_install_days"]),
            target_segments=frozenset(s for s in str(r["target_segments"]).split(";") if s),
        )
    return products


@lru_cache
def get_dataset() -> Dataset:
    d = get_settings().data_dir
    products = _parse_products(pd.read_csv(d / "product_catalogue.csv"))
    gstin = pd.read_csv(d / "mock_gstin_registry.csv", dtype=str).set_index("gstin", drop=False)
    udyam = pd.read_csv(d / "mock_udyam_registry.csv", dtype=str).set_index("udyam_number", drop=False)
    leads = pd.read_csv(d / "smb_leads.csv", dtype={"gstin": str, "udyam_number": str})
    ds = Dataset(products=products, gstin=gstin, udyam=udyam, leads=leads)
    cities = leads[["city", "city_tier", "state"]].drop_duplicates("city")
    ds.city_tier = {r.city: int(r.city_tier) for r in cities.itertuples()}
    ds.city_state = {r.city: r.state for r in cities.itertuples()}
    seg = leads[["business_type", "segment"]].drop_duplicates("business_type")
    ds.business_segment = {r.business_type: SEGMENT_CODES[r.segment] for r in seg.itertuples()}
    return ds
