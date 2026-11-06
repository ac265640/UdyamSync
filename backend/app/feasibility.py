"""Mock site feasibility by pincode (production: the network inventory / route-survey API).

Rule: pincodes whose last two digits are 00-07 have no fibre yet (~8% of sites, in line with the
41 'site not feasible for fibre' drops among 588 KYC-complete leads). Those sites get 5G AirFiber.
"""
from __future__ import annotations

import re

from .data import get_dataset

FIBRE_GAP_SUFFIX = 8


def fibre_ok(pincode: str | None) -> bool:
    return not (pincode and pincode.isdigit() and int(pincode[-2:]) < FIBRE_GAP_SUFFIX)


def check(pincode: str) -> dict:
    pin = (pincode or "").strip()
    if not re.fullmatch(r"[1-9]\d{5}", pin):
        return {"pincode": pin, "valid": False, "message": "Enter a 6-digit pincode."}
    ds = get_dataset()
    fibre_days = ds.products["P01"].install_days
    air_days = ds.products["P04"].install_days
    if fibre_ok(pin):
        return {"pincode": pin, "valid": True, "fibre": True, "technology": "Fibre", "install_days": fibre_days,
                "message": f"Fibre available. Installed in about {fibre_days} days."}
    return {"pincode": pin, "valid": True, "fibre": False, "technology": "5G AirFiber", "install_days": air_days,
            "message": f"Fibre is still under route survey here, so this site gets 5G AirFiber: plug-and-play, live in about {air_days} days. "
                       "We'll offer a free switch to fibre when it arrives."}
