"""
Mock Screening Service for Rudrik.
Simulates PEP, Sanctions, and Adverse Media screening.
Replace with real provider (Refinitiv, ComplyAdvantage, Dow Jones) in production.
"""
import uuid
import secrets
from datetime import datetime, timezone


class ScreeningService:
    """Mock screening service - returns simulated results"""

    async def screen_pep(self, customer_data: dict) -> dict:
        # Simulate PEP detection (~30% chance)
        is_pep = secrets.randbelow(10) < 3

        if is_pep:
            tiers = ["tier1", "tier2", "tier3", "rca"]
            weights = [1, 2, 3, 4]  # tier3/rca more common
            tier_idx = secrets.randbelow(sum(weights))
            cumulative = 0
            selected_tier = "tier3"
            for i, w in enumerate(weights):
                cumulative += w
                if tier_idx < cumulative:
                    selected_tier = tiers[i]
                    break

            positions = [
                "Member of Parliament", "Minister of Finance", "Central Bank Governor",
                "Ambassador", "Mayor", "State Governor", "Military General",
                "Director of State Enterprise", "Senior Judge"
            ]
            countries = ["United Kingdom", "Germany", "Nigeria", "Brazil", "Russia", "China", "India"]
            orgs = [
                "National Parliament", "Ministry of Finance", "Central Bank",
                "Ministry of Foreign Affairs", "State Government", "Supreme Court"
            ]
            sources = [
                "World-Check (Refinitiv)", "Dow Jones Risk & Compliance",
                "ComplyAdvantage PEP Database", "OpenSanctions"
            ]

            return {
                "is_pep": True,
                "pep_tier": selected_tier,
                "match_confidence": 75 + secrets.randbelow(25),
                "match_details": {
                    "position": positions[secrets.randbelow(len(positions))],
                    "country": countries[secrets.randbelow(len(countries))],
                    "organisation": orgs[secrets.randbelow(len(orgs))],
                    "is_former": secrets.randbelow(2) == 0,
                    "source": sources[secrets.randbelow(len(sources))],
                    "last_updated": datetime.now(timezone.utc).isoformat()
                },
                "screened_at": datetime.now(timezone.utc).isoformat()
            }

        return {
            "is_pep": False,
            "pep_tier": None,
            "match_confidence": 0,
            "match_details": None,
            "screened_at": datetime.now(timezone.utc).isoformat()
        }

    async def screen_adverse_media(self, customer_data: dict) -> dict:
        full_name = customer_data.get("full_name", "Unknown")

        # Simulate adverse media detection (~40% chance)
        has_hits = secrets.randbelow(10) < 4

        if has_hits:
            num_hits = 1 + secrets.randbelow(3)
            categories = [
                "financial_crime", "fraud", "corruption", "money_laundering",
                "tax_evasion", "sanctions_violation", "terrorism_financing",
                "regulatory_action", "bribery"
            ]
            sources_list = [
                "Reuters", "Bloomberg", "Financial Times", "BBC News",
                "Wall Street Journal", "The Guardian", "AP News"
            ]
            headlines_templates = [
                f"{full_name} linked to suspicious financial transactions",
                f"Regulatory investigation opened into {full_name}'s business dealings",
                f"{full_name} named in corruption probe by authorities",
                f"Financial irregularities reported involving {full_name}",
                f"Tax authorities reviewing {full_name}'s offshore accounts",
                f"{full_name} faces allegations of money laundering"
            ]

            hits = []
            for i in range(num_hits):
                hits.append({
                    "id": str(uuid.uuid4()),
                    "headline": headlines_templates[secrets.randbelow(len(headlines_templates))],
                    "summary": f"News report detailing potential compliance concerns related to {full_name}. Further investigation recommended.",
                    "source": sources_list[secrets.randbelow(len(sources_list))],
                    "category": categories[secrets.randbelow(len(categories))],
                    "publication_date": f"2025-{1 + secrets.randbelow(12):02d}-{1 + secrets.randbelow(28):02d}",
                    "relevance": None,
                    "reviewed_by": None,
                    "reviewed_at": None,
                    "link": None,
                    "match_score": 60 + secrets.randbelow(40)
                })

            return {
                "has_hits": True,
                "hit_count": len(hits),
                "hits": hits,
                "screened_at": datetime.now(timezone.utc).isoformat()
            }

        return {
            "has_hits": False,
            "hit_count": 0,
            "hits": [],
            "screened_at": datetime.now(timezone.utc).isoformat()
        }

    async def screen_sanctions(self, customer_data: dict) -> dict:
        full_name = customer_data.get("full_name", "Unknown")

        # Simulate sanctions detection (~15% chance)
        has_match = secrets.randbelow(20) < 3

        if has_match:
            lists_options = [
                "OFAC SDN List", "EU Consolidated List", "UN Security Council",
                "HM Treasury Sanctions List", "DFAT Consolidated List"
            ]
            return {
                "status": "potential_match",
                "match_confidence": 70 + secrets.randbelow(30),
                "matched_list": lists_options[secrets.randbelow(len(lists_options))],
                "matched_name": full_name,
                "screened_at": datetime.now(timezone.utc).isoformat()
            }

        return {
            "status": "no_match",
            "match_confidence": 0,
            "matched_list": None,
            "matched_name": None,
            "screened_at": datetime.now(timezone.utc).isoformat()
        }


screening_service = ScreeningService()
