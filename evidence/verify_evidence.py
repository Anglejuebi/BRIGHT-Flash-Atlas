#!/usr/bin/env python3
"""Re-verify the two headline numbers from the copies inside BRIGHT-Flash-ex/files/.

Run:  python3 verify_evidence.py
Everything is read from ./files/ (originals remain untouched in the project tree).
The script prints PASS/DIFF per check and a final verdict.
"""
from __future__ import annotations

import csv
import hashlib
import json
import statistics
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent
FILES = BASE / "files"

EXPECTED_AUC_VAL = 0.8622426385790309
EXPECTED_AUC_TEST = 0.8577092943398806
TOL = 1e-12


def ok(flag: bool) -> str:
    return "PASS" if flag else "DIFF"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    failures = 0

    print("=" * 78)
    print("A. 0.8622  (BRIGHT-Flash-1007, mean best_validation.macro_ovr_auc over 20 tasks)")
    print("=" * 78)

    raw = json.loads((FILES / "data/batch_summary.json").read_text())
    vals = [r["best_validation"]["macro_ovr_auc"] for r in raw["results"]]
    tests = [r["held_out_test"]["macro_ovr_auc"] for r in raw["results"]]
    mean_val, mean_test = statistics.mean(vals), statistics.mean(tests)
    print(f"A1 batch_summary.json (原始运行)          n={len(vals):2d}  val={mean_val:.16f}  test={mean_test:.16f}")
    same = abs(mean_val - EXPECTED_AUC_VAL) < TOL and abs(mean_test - EXPECTED_AUC_TEST) < TOL
    print(f"   -> {ok(same)} 与发布值逐位一致")
    failures += 0 if same else 1

    pub = json.loads((FILES / "web/github-pages/sources/1007_validation_test.json").read_text())
    mv, mt = pub["mean_auc"]["tasks20_validation"], pub["mean_auc"]["tasks20_test"]
    print(f"A2 1007_validation_test.json (发布)        val={mv!r}  test={mt!r}")
    same2 = abs(mv - EXPECTED_AUC_VAL) < TOL and abs(mt - EXPECTED_AUC_TEST) < TOL
    print(f"   -> {ok(same2)}")
    failures += 0 if same2 else 1

    legacy = [r for r in csv.DictReader((FILES / "visualizations/data/perfomance.csv").open(encoding="utf-8-sig"))
              if r["Model"] == "BRIGHT-Flash-1007" and r.get("AUC")]
    m3 = statistics.mean(float(r["AUC"]) for r in legacy)
    print(f"A3 perfomance.csv (历史总表)               rows={len(legacy):2d}  mean={m3:.16f}")
    same3 = abs(m3 - EXPECTED_AUC_VAL) < TOL
    print(f"   -> {ok(same3)}")
    failures += 0 if same3 else 1

    jt = {t["task"]: t["validation"]["auc"] for t in pub["task_results"]}
    dt = {r["task"]: r["best_validation"]["macro_ovr_auc"] for r in raw["results"]}
    common = set(jt) & set(dt)
    mism = [k for k in common if abs(jt[k] - dt[k]) > TOL]
    print(f"A4 逐任务对比                              matched={len(common):2d}/{len(dt)}  mismatches={len(mism)}")
    print(f"   -> {ok(len(common) == 20 and not mism)}")
    failures += 0 if (len(common) == 20 and not mism) else 1

    print("\nA5 汇总表里的 1007 值")
    for rel, col in (("web/github-pages/sources/model_summary_12models.csv", "Mean AUC (20 tasks)"),
                     ("visualizations/all_models_h1030_v1031/data/model_summary.csv", "Mean AUC (20 tasks)"),
                     ("visualizations/time_auc_scatter/time_auc_summary.csv", "Mean AUC"),
                     ("web/github-pages/sources/time_auc_summary.csv", "Mean AUC")):
        rows = list(csv.DictReader((FILES / rel).open(encoding="utf-8-sig")))
        row = next((r for r in rows if "1007" in json.dumps(r, ensure_ascii=False)), None)
        v = float(row[col]) if row and row.get(col) else None
        # these tables store 6 decimals, so allow 5e-7 rounding rather than 1e-12
        good = v is not None and abs(v - EXPECTED_AUC_VAL) < 5e-7
        print(f"   {ok(good)}  {rel:<58s} {v}")
        failures += 0 if good else 1

    print("\n" + "=" * 78)
    print("B. 2.08 s  (BRIGHT-Flash-5x, model-only per-slide time, 150 slides)")
    print("=" * 78)

    agg = {r["Model"]: r for r in csv.DictReader((FILES / "speed_bench/model_summary.csv").open(encoding="utf-8-sig"))}
    a = agg["BRIGHT-Flash-5x"]
    print(f"B1 model_summary.csv (聚合)               slides={a['Slides']}  failed={a['Failed']}  "
          f"mean={float(a['Mean total (s)']):.10f}  median={float(a['Median total (s)']):.10f}  load={float(a['Model load (s)']):.3f}s")
    good = abs(float(a["Mean total (s)"]) - 2.07964288331413) < 1e-12 and a["Slides"] == "150" and a["Failed"] == "0"
    print(f"   -> {ok(good)}")
    failures += 0 if good else 1

    per_slide = {}
    for rel in (".history/summary_20260923090118.csv", ".history/summary_20260923090240.csv"):
        rows = list(csv.DictReader((FILES / rel).open(encoding="utf-8-sig")))
        by = defaultdict(list)
        for r in rows:
            if r.get("total_s"):
                by[r["model"]].append(float(r["total_s"]))
        per_slide[rel] = by
        v = by["BRIGHT-Flash-5x"]
        print(f"B2 {rel:<40s} rows={len(rows)}  Flash5x n={len(v)}  "
              f"mean={statistics.mean(v):.5f}  median={statistics.median(v):.5f}  std={statistics.pstdev(v):.3f}")
    same_snap = (len(per_slide[".history/summary_20260923090118.csv"]["BRIGHT-Flash-5x"]) == 150 and
                 abs(statistics.mean(per_slide[".history/summary_20260923090118.csv"]["BRIGHT-Flash-5x"]) -
                     statistics.mean(per_slide[".history/summary_20260923090240.csv"]["BRIGHT-Flash-5x"])) < 1e-12)
    print(f"   -> {ok(same_snap)} 两份快照一致（同一运行的两次保存）")
    failures += 0 if same_snap else 1

    print("\nB3 聚合表 vs 逐切片重算（8 个模型，系统性偏差）")
    by = per_slide[".history/summary_20260923090118.csv"]
    for model, v in sorted(by.items()):
        row = agg.get(model)
        if not row:
            continue
        agg_mean = float(row["Mean total (s)"])
        print(f"   {model:<26s} n={len(v):3d}  agg={agg_mean:8.4f}  slide={statistics.mean(v):8.4f}  Δ={agg_mean-statistics.mean(v):+.4f}")

    fl = [r for r in csv.DictReader((FILES / ".history/summary_20260923090118.csv").open(encoding="utf-8-sig"))
          if r["model"] == "BRIGHT-Flash-5x"]
    core = ("io_s", "infer_s", "s2_s", "feature_write_s")
    composed = sum(1 for r in fl
                   if abs(sum(float(r[c]) for c in core if r.get(c) not in (None, "", "nan")) - float(r["total_s"]))
                   < max(0.02, 0.02 * float(r["total_s"])))
    dev = statistics.mean(abs(sum(float(r[c]) for c in core if r.get(c) not in (None, "", "nan")) - float(r["total_s"]))
                          for r in fl)
    print(f"\nB4 分量自洽 io+infer+s2+write ≈ total_s    {composed}/{len(fl)}  平均偏差={dev:.5f}s")
    print(f"   -> {ok(composed == len(fl))}")
    failures += 0 if composed == len(fl) else 1

    js = json.loads((FILES / "visualizations/time_breakdown/time_per_slide_breakdown.json").read_text())
    row = next(m for m in js["models"] if m["model"] == "BRIGHT-Flash")
    r1007 = next(m for m in js["models"] if m["model"] == "BRIGHT-Flash-1007")
    print(f"\nB5 time_per_slide_breakdown.json          model_total={row['model_total_s']:.10f}  "
          f"end_to_end={row['end_to_end_s']:.10f}  prepare={row['prepare_s']}")
    derived_ok = abs(row["model_total_s"] - 2.07964288331413) < 1e-12
    print(f"   -> {ok(derived_ok)}")
    failures += 0 if derived_ok else 1
    inherited = abs(r1007["model_total_s"] - row["model_total_s"]) < 1e-12
    print(f"   -> {ok(inherited)} 1007 的耗时与 BRIGHT-Flash 逐位相同 = {inherited}（说明是沿用，不是独立测量）")

    print("\n" + "=" * 78)
    print(f"RESULT: {'ALL CHECKS PASS' if failures == 0 else str(failures) + ' CHECK(S) DIFFERED'}")
    print("=" * 78)
    print("\n文件 SHA-256:")
    for p in sorted(FILES.rglob("*")):
        if p.is_file():
            print(f"  {sha256(p)}  {p.relative_to(BASE)}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
