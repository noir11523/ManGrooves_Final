"""Generate static analytics images from verified ManGROOVES records.

The script intentionally uses the bundled MySQL command-line client instead of
requiring a Python database driver. This keeps the XAMPP setup reproducible.
"""

from __future__ import annotations

import csv
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "public" / "generated" / "analytics"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def mysql_rows(query: str, settings: dict[str, str]) -> list[list[str]]:
    mysql_setting = settings.get("MYSQL_BIN", "mysql")
    mysql_path = Path(mysql_setting)
    if mysql_path.parent != Path(".") or mysql_path.is_absolute():
        if not mysql_path.exists():
            raise RuntimeError(f"MySQL client not found: {mysql_path}")
        mysql_bin = str(mysql_path)
    else:
        mysql_bin = shutil.which(mysql_setting) or ""
        if not mysql_bin:
            raise RuntimeError(f"MySQL client is not on PATH: {mysql_setting}")

    command = [
        mysql_bin,
        f"--host={settings.get('DB_HOST', '127.0.0.1')}",
        f"--port={settings.get('DB_PORT', '3306')}",
        f"--user={settings.get('DB_USERNAME', 'root')}",
        "--batch",
        "--raw",
        "--skip-column-names",
        f"--database={settings.get('DB_DATABASE', 'mangrooves_db')}",
        f"--execute={query}",
    ]
    process_env = os.environ.copy()
    if settings.get("DB_PASSWORD"):
        process_env["MYSQL_PWD"] = settings["DB_PASSWORD"]

    result = subprocess.run(
        command,
        capture_output=True,
        check=False,
        text=True,
        encoding="utf-8",
        env=process_env,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "MySQL query failed")
    return list(csv.reader(result.stdout.splitlines(), delimiter="\t"))


def configure_style() -> None:
    sns.set_theme(style="whitegrid")
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 14,
            "figure.facecolor": "#ffffff",
            "axes.facecolor": "#ffffff",
        }
    )


def generate_health_chart(settings: dict[str, str]) -> dict[str, int]:
    rows = mysql_rows(
        "SELECT COALESCE(final_health, suggested_health), COUNT(*) "
        "FROM reports WHERE status='verified' "
        "GROUP BY COALESCE(final_health, suggested_health) "
        "ORDER BY FIELD(COALESCE(final_health, suggested_health),'Healthy','Stressed','At Risk')",
        settings,
    )
    counts = {row[0]: int(row[1]) for row in rows}
    labels = [label for label in ("Healthy", "Stressed", "At Risk") if counts.get(label, 0) > 0]
    values = [counts[label] for label in labels]

    fig, ax = plt.subplots(figsize=(8, 5), dpi=150)
    if values:
        colors = {"Healthy": "#2D5A27", "Stressed": "#E0A21A", "At Risk": "#B23A3A"}
        ax.pie(
            values,
            labels=labels,
            colors=[colors[label] for label in labels],
            autopct=lambda value: f"{value:.0f}%",
            startangle=90,
            wedgeprops={"linewidth": 2, "edgecolor": "white"},
        )
        ax.set_title("Verified Mangrove Health Distribution")
    else:
        ax.text(0.5, 0.5, "No verified reports yet", ha="center", va="center", fontsize=14)
        ax.axis("off")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "health-distribution.png", bbox_inches="tight")
    plt.close(fig)
    return counts


def generate_survival_chart(settings: dict[str, str]) -> list[dict[str, float | int | str]]:
    rows = mysql_rows(
        "SELECT DATE_FORMAT(r.verified_at,'%Y-%m') AS month_key, "
        "ROUND(AVG(CASE WHEN c.initial_seedlings > 0 AND r.observed_alive_count IS NOT NULL "
        "THEN LEAST(100, (r.observed_alive_count * 100.0) / c.initial_seedlings) END),2) AS survival_rate, "
        "COUNT(*) AS report_count "
        "FROM reports r LEFT JOIN mangrove_clusters c ON c.id=r.cluster_id "
        "WHERE r.status='verified' AND r.verified_at IS NOT NULL "
        "GROUP BY DATE_FORMAT(r.verified_at,'%Y-%m') ORDER BY month_key",
        settings,
    )
    points: list[dict[str, float | int | str]] = []
    for row in rows:
        if len(row) < 3 or row[1] in ("", "NULL"):
            continue
        points.append({"month": row[0], "survival_rate": float(row[1]), "report_count": int(row[2])})

    fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
    if points:
        frame = pd.DataFrame(points)
        sns.lineplot(data=frame, x="month", y="survival_rate", marker="o", linewidth=3, color="#2D5A27", ax=ax)
        ax.fill_between(range(len(frame)), frame["survival_rate"], alpha=0.12, color="#2D5A27")
        ax.set_ylim(0, 105)
        ax.set_xlabel("Verification month")
        ax.set_ylabel("Estimated survival rate (%)")
        ax.set_title("Verified Survival Trend")
        ax.tick_params(axis="x", rotation=30)
    else:
        ax.text(0.5, 0.5, "No verified reports with seedling counts yet", ha="center", va="center", fontsize=14)
        ax.axis("off")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "survival-trend.png", bbox_inches="tight")
    plt.close(fig)
    return points


def main() -> int:
    settings = load_env(PROJECT_ROOT / ".env")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    configure_style()

    health_counts = generate_health_chart(settings)
    survival_points = generate_survival_chart(settings)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "health_counts": health_counts,
        "survival_points": survival_points,
        "methodology": "Verified reports only; survival uses observed alive seedlings divided by each cluster's initial seedlings, capped at 100%.",
    }
    (OUTPUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Generated analytics in {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Keep scheduled-task output actionable.
        print(f"Analytics generation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
