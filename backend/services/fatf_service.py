"""
FATF Country Risk Classification Service.
Maintains separate Black List (Call for Action) and Grey List (Increased Monitoring)
based on the latest FATF publications.
"""
from typing import Optional

# FATF Black List — High-Risk Jurisdictions Subject to a Call for Action
# Source: FATF Public Statement (updated Feb 2025)
FATF_BLACK_LIST = {
    "KP",  # North Korea (DPRK)
    "IR",  # Iran
    "MM",  # Myanmar
}

# FATF Grey List — Jurisdictions Under Increased Monitoring
# Source: FATF "Jurisdictions under Increased Monitoring" (updated Feb 2025)
FATF_GREY_LIST = {
    "AF",  # Afghanistan
    "AL",  # Albania
    "BB",  # Barbados
    "BF",  # Burkina Faso
    "CM",  # Cameroon
    "CD",  # Congo (DR)
    "GI",  # Gibraltar
    "HT",  # Haiti
    "JM",  # Jamaica
    "JO",  # Jordan
    "ML",  # Mali
    "MZ",  # Mozambique
    "NI",  # Nicaragua
    "NG",  # Nigeria
    "PK",  # Pakistan
    "PA",  # Panama
    "PH",  # Philippines
    "SN",  # Senegal
    "SS",  # South Sudan
    "SY",  # Syria
    "TZ",  # Tanzania
    "TR",  # Turkey (Turkiye)
    "UG",  # Uganda
    "VN",  # Vietnam
    "YE",  # Yemen
}

# Country code → Full name mapping (for display)
COUNTRY_NAMES = {
    "KP": "North Korea", "IR": "Iran", "MM": "Myanmar",
    "AF": "Afghanistan", "AL": "Albania", "BB": "Barbados", "BF": "Burkina Faso",
    "CM": "Cameroon", "CD": "DR Congo", "GI": "Gibraltar", "HT": "Haiti",
    "JM": "Jamaica", "JO": "Jordan", "ML": "Mali", "MZ": "Mozambique",
    "NI": "Nicaragua", "NG": "Nigeria", "PK": "Pakistan", "PA": "Panama",
    "PH": "Philippines", "SN": "Senegal", "SS": "South Sudan", "SY": "Syria",
    "TZ": "Tanzania", "TR": "Turkey", "UG": "Uganda", "VN": "Vietnam",
    "YE": "Yemen",
}


def classify_country(country_code: Optional[str]) -> dict:
    """
    Classify a country code into FATF risk category.
    Returns: { level, list_type, label, risk_score_impact, country_name }
    """
    if not country_code:
        return {"level": "standard", "list_type": None, "label": None, "risk_score_impact": 0, "country_name": None}

    code = country_code.strip().upper()
    name = COUNTRY_NAMES.get(code, code)

    if code in FATF_BLACK_LIST:
        return {
            "level": "black_list",
            "list_type": "FATF Black List",
            "label": "FATF Call for Action",
            "risk_score_impact": 25,
            "country_name": name,
        }

    if code in FATF_GREY_LIST:
        return {
            "level": "grey_list",
            "list_type": "FATF Grey List",
            "label": "FATF Increased Monitoring",
            "risk_score_impact": 10,
            "country_name": name,
        }

    return {"level": "standard", "list_type": None, "label": None, "risk_score_impact": 0, "country_name": name}


def is_high_risk(country_code: Optional[str]) -> bool:
    """Check if a country is on either FATF list."""
    if not country_code:
        return False
    code = country_code.strip().upper()
    return code in FATF_BLACK_LIST or code in FATF_GREY_LIST


def get_all_lists() -> dict:
    """Return full FATF lists with country names for display."""
    return {
        "black_list": [
            {"code": c, "name": COUNTRY_NAMES.get(c, c)} for c in sorted(FATF_BLACK_LIST)
        ],
        "grey_list": [
            {"code": c, "name": COUNTRY_NAMES.get(c, c)} for c in sorted(FATF_GREY_LIST)
        ],
    }
