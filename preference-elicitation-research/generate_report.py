"""
Generate report.md from deep-research JSON results.
"""
import json
import os
import glob
import re
import yaml

BASE = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE, "results")
FIELDS_PATH = os.path.join(BASE, "fields.yaml")
OUTPUT_PATH = os.path.join(BASE, "report.md")

TOC_FIELDS = [
    "cold_start_applicability",
    "cognitive_load",
    "abstraction_level",
    "negative_positive_symmetry",
]

FIELD_ORDER = [
    "elicitation_method",
    "abstraction_level",
    "signal_quality_for_recommender",
    "reason_attributability",
    "cold_start_applicability",
    "cognitive_load",
    "introspection_harm_risk",
    "folk_theory_dependence",
    "negative_positive_symmetry",
    "confounded_with_friction_flag",
    "key_finding",
    "gap_from_real_practice",
    "proposed_taxonomy_contribution",
]

SKIP_KEYS = {"item", "sources", "uncertain", "_source_file"}


def slug(name):
    s = name.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def is_uncertain(val, field_name, uncertain_list):
    if field_name in uncertain_list:
        return True
    if val is None or val == "":
        return True
    if isinstance(val, str) and "[uncertain]" in val:
        return True
    return False


def format_value(val):
    if isinstance(val, list):
        if not val:
            return "—"
        if all(isinstance(v, dict) for v in val):
            lines = []
            for item in val:
                parts = [f"{k}: {v}" for k, v in item.items()]
                lines.append(" | ".join(parts))
            return "<br>".join(lines)
        if len(val) <= 4:
            return ", ".join(str(v) for v in val)
        return "<br>".join(str(v) for v in val)
    if isinstance(val, dict):
        parts = []
        for k, v in val.items():
            parts.append(f"**{k}:** {v}")
        return "; ".join(parts)
    if isinstance(val, str) and len(val) > 120:
        # Wrap long text as blockquote
        return "> " + val.replace("\n", "\n> ")
    return str(val)


def short_value(val, max_len=60):
    """For TOC display — trim to one line."""
    s = str(val)
    s = s.split("\n")[0].strip()
    if s.startswith(">"):
        s = s[1:].strip()
    if len(s) > max_len:
        s = s[:max_len].rstrip() + "…"
    return s


def load_field_descriptions(fields_path):
    with open(fields_path) as fh:
        data = yaml.safe_load(fh)
    desc = {}
    for field in data.get("fields", []):
        desc[field["name"]] = field.get("description", "")
    return desc


def main():
    with open(FIELDS_PATH) as fh:
        fields_yaml = yaml.safe_load(fh)
    defined_fields = {f["name"] for f in fields_yaml.get("fields", [])}
    field_desc = load_field_descriptions(FIELDS_PATH)

    results = []
    for path in sorted(glob.glob(os.path.join(RESULTS_DIR, "*.json"))):
        with open(path) as fh:
            data = json.load(fh)
        data["_source_file"] = os.path.basename(path)
        results.append(data)

    lines = []

    # Title
    lines.append("# Preference Elicitation Research Report\n")
    lines.append(
        "_Topic: Preference elicitation questions for content recommenders — "
        "dislike signals, cold-start, and the gap between folk explanations of "
        "taste and system-usable features_\n"
    )
    lines.append(f"_{len(results)} items researched_\n")
    lines.append("---\n")

    # TOC
    lines.append("## Table of Contents\n")
    for i, item in enumerate(results, 1):
        name = item.get("item", item["_source_file"])
        uncertain_list = item.get("uncertain", [])
        anchor = slug(name)
        toc_parts = [f"{i}. [{name}](#{anchor})"]
        extras = []
        for field in TOC_FIELDS:
            val = item.get(field)
            if not is_uncertain(val, field, uncertain_list):
                extras.append(f"**{field.replace('_', ' ')}:** {short_value(val, 50)}")
        if extras:
            toc_parts.append(" — " + " | ".join(extras))
        lines.append("".join(toc_parts) + "\n")

    lines.append("\n---\n")

    # Detail sections
    lines.append("## Detailed Findings\n")
    for item in results:
        name = item.get("item", item["_source_file"])
        uncertain_list = item.get("uncertain", [])
        anchor = slug(name)
        lines.append(f"### {name} {{#{anchor}}}\n")

        # Defined fields in order
        for field in FIELD_ORDER:
            if field in SKIP_KEYS:
                continue
            val = item.get(field)
            if is_uncertain(val, field, uncertain_list):
                continue
            label = field.replace("_", " ").title()
            desc = field_desc.get(field, "")
            lines.append(f"**{label}**")
            if desc:
                lines.append(f" _{desc}_")
            lines.append("\n\n")
            lines.append(format_value(val) + "\n\n")

        # Extra fields not in defined set
        extra_fields = [
            k for k in item.keys()
            if k not in SKIP_KEYS and k not in defined_fields and k not in FIELD_ORDER
            and k != "_source_file"
        ]
        if extra_fields:
            lines.append("**Other Info**\n\n")
            for k in extra_fields:
                val = item.get(k)
                if val is not None:
                    lines.append(f"- **{k}:** {format_value(val)}\n")
            lines.append("\n")

        # Sources
        sources = item.get("sources", [])
        if sources:
            lines.append("**Sources**\n\n")
            for src in sources:
                if src.startswith("http"):
                    lines.append(f"- <{src}>\n")
                else:
                    lines.append(f"- {src}\n")
            lines.append("\n")

        # Uncertain
        if uncertain_list:
            lines.append(
                f"_Uncertain fields (skipped): {', '.join(uncertain_list)}_\n\n"
            )

        lines.append("---\n\n")

    with open(OUTPUT_PATH, "w") as fh:
        fh.write("".join(lines))

    print(f"Report written to {OUTPUT_PATH}")
    print(f"Items: {len(results)}")


if __name__ == "__main__":
    main()
