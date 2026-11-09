# BRIGHT-Flash-ex — 两个关键指标的证据包

本目录是 **`0.8622`（BRIGHT-Flash-1007 的 20 任务平均 val AUC）** 与 **`2.08 s/张`（BRIGHT-Flash-5x 单张推理耗时）** 两个数字的完整证据副本，用于独立复核。

所有副本保留原始相对路径（`files/` 下），原件仍在项目树中未改动。

```
BRIGHT-Flash-ex/
├── README.md              ← 本文件：证据索引 + 结论 + 缺口
├── verify_evidence.py     ← 复核脚本（只读 files/，不读项目其他位置）
├── verify_output.txt      ← 本次运行的完整输出（全部 PASS）
├── MANIFEST.sha256        ← 所有副本的 SHA-256
└── files/                 ← 20 份原始文件副本（2.2 MB）
```

复核方式：

```bash
cd BRIGHT-Flash-ex && python3 verify_evidence.py
```

---

## 结论

| 指标 | 真实性 | 强度 | 说明 |
|---|---|---|---|
| **0.8622** | 真实，可精确重算 | **强** | 7 类文件、20/20 逐任务零差异，可由原始运行输出重算到双精度 |
| **2.08 s** | 真实测量 | **中** | 3 类文件互证，但聚合值比唯一幸存的逐切片快照高 2.1%，原始 `summary.json` 已丢失 |

---

## A 组：0.8622（AUC）

**定义**：`BRIGHT-Flash-1007` = 5x 学生 ep6 + ABMIL，20 个临床任务，逐任务取 best epoch，指标为 `best_validation.macro_ovr_auc`。

| 代号 | 文件 | 内容 | 复核结果 |
|---|---|---|---|
| A1 | `files/data/batch_summary.json` | **原始运行输出**（`run_20261008_005212`，mode=batch，feature_source=5x，20 任务） | 重算 val 均值 = `0.8622426385790309`，test 均值 = `0.8577092943398806` |
| A2 | `files/web/github-pages/sources/1007_validation_test.json` | 发布用汇总 + 20 任务明细 | `0.8622426385790309` / `0.8577092943398806`，与 A1 **差 0.0** |
| A3 | `files/visualizations/data/perfomance.csv` | 历史总表（1007 共 20 行） | 20 行重算 = `0.8622426385790309` |
| A4 | A1 与 A2 的逐任务对比 | 20 个任务的 val AUC | **matched 20/20，mismatches 0**（阈值 1e-12） |
| A5 | `files/web/github-pages/sources/model_summary_12models.csv`<br>`files/visualizations/all_models_h1030_v1031/data/model_summary.csv`<br>`files/visualizations/time_auc_scatter/time_auc_summary.csv`<br>`files/web/github-pages/sources/time_auc_summary.csv` | 4 张汇总表 | `0.862242639` ×2、`0.862243` ×2（后两者只存 6 位小数） |
| A6 | `files/visualizations/data/BRIGHT-Flash-1007_metric_check.md` | 当时做的逐任务校验记录 | 写明 `Mean over 20 tasks = 0.86224263857903097`，20/20 "CSV equals JSON: Yes" |
| A7 | `files/visualizations/data/BRIGHT-Flash-1007_import_audit.json` | 导入审计 | 记录 1007 数据的导入来源与校验 |
| A8 | `files/docs/project_reading/2026-10-25/data_audit.json`<br>`files/docs/project_reading/2026-10-25/web_audit.json` | 独立阅读审计 | 同样引用 `0.8622426…` |
| A9 | `files/web/data.json` | 站点数据 | 内嵌同一数值 |

**原始运行元信息（来自 A1）**

```
mode            = batch
feature_source  = 5x
feature_contract= {path_column: student_h5, dataset: bright_flash_feature,
                   feature_dim: 1536, leading_metadata_columns: 2}
output_root     = <nas-home>/Desktop/Data/C1-TMUCIH-BRIGHT-Flash-Student-5x-ep6/results/run_20261008_005212
updated_at      = 2026-10-08T04:27:07+0800
tasks_completed = 20
```

### A 组的缺口（必须知道）

1. 该次运行的 `test_predictions.csv` **没有保留**，因此无法从原始预测独立重算 AUC；只能证明"文件之间完全一致 + 可由 batch_summary 精确重算"。
2. 该次运行**没有记录用哪个指标选 epoch**。仓库默认是 `macro_f1`；文件描述写的是 "validation-best epoch selected per task"。二者不同，现有文件无法判定。
3. 0.8622 是**我们自己的 80/10/10 患者分组划分**下的数值，与 gpu03 上用 `results_202511` split 跑出的 0.8473 不是同一协议，不可混比。

---

## B 组：2.08 s（耗时）

**定义**：`BRIGHT-Flash-5x` 单张切片、**仅模型推理**（不含预处理与分割），150 张切片，`sequential`、`ColdRead=True`。

| 代号 | 文件 | 内容 | 复核结果 |
|---|---|---|---|
| B1 | `files/speed_bench/model_summary.csv` | **聚合基准表**（8 模型 × 150 张的汇总） | `Mean total = 2.07964288331413`，`Median = 1.8915`，`Model load = 0.660 s`，`Slides=150`，`Failed=0`，GPU peak 11.94 GB，0.4809 张/s |
| B2 | `files/.history/summary_20260923090118.csv` | **逐切片原始表**（1,200 行 = 8 模型 × 150 张，39 列） | 5x 学生 n=150，**mean 2.0375 / median 1.8985 / std 1.029 / min 0.437 / p95 4.151 / max 4.840** |
| B3 | `files/.history/summary_20260923090240.csv` | 同一运行的第二次保存 | 与 B2 **内容完全相同**（SHA-256 相同） |
| B4 | `files/visualizations/time_breakdown/time_per_slide_breakdown.json`<br>`…/time_per_slide_breakdown.csv` | 派生（CSV→JSON 重排） | `model_total_s = 2.07964288331413`，`end_to_end_s = 4.5096`（= 2.0796 + prepare 2.43） |
| B5 | `files/web/github-pages/sources/time_per_slide_breakdown.csv`<br>`files/web/github-pages/sources/time_auc_summary.csv` | 站点副本 | 同为 `2.0796` / `2.08` |
| B6 | `files/visualizations/paper_figures/figure1_time_auc_7models_data.csv`<br>`…/figure2_time_composition_7models_data.csv` | 论文图数据 | 含 2.0796 与 AUC 的对应关系 |

**内部自洽性**：逐切片文件中 `io_s + infer_s + s2_s + feature_write_s ≈ total_s`，**150/150 通过**，平均绝对偏差 0.0175 s（占时长 0.86%）。

### 2.1% 的口径缺口（已量化）

聚合表（2.0796）比逐切片快照（2.0375）高 **+0.042 s**，且这是**所有模型同向**的系统差：

| 模型 | 聚合表 | 逐切片重算 | Δ |
|---|---:|---:|---:|
| BRIGHT | 32.9735 | 32.7962 | +0.1773 |
| **BRIGHT-Flash-5x** | **2.0796** | **2.0375** | **+0.0422** |
| BRIGHT-Flash-pipeline | 6.2313 | 6.1333 | +0.0980 |
| CHIEF | 12.5763 | 12.4525 | +0.1238 |
| Conchv1.5 | 36.3074 | 33.7937 | **+2.5137**（逐切片仅 144 行，缺 6 张） |
| Prov-Gigapath | 29.1396 | 29.0709 | +0.0688 |
| UNIv2 | 26.0429 | 25.9920 | +0.0509 |
| Virchow2 | 25.6768 | 25.5661 | +0.1107 |

最可能原因：**聚合表（2026-09-24 09:05）比逐切片快照（2026-09-23 09:01）晚一天**，最终聚合来自稍后一次运行，而那次运行的逐切片 `summary.csv` 未被保存。中位数几乎一致（1.8915 vs 1.8985，差 0.007）支持"同一实验、不同批次聚合"。

### B 组的三个口径警告

1. **2.08 s 只是 5x 学生单独推理**；不含预处理 2.43 s、分割 1.33 s。**端到端是 4.51 s**。
2. **1007 的 2.08 s 是沿用的**，不是独立测量 —— 派生 json 中 1007 与 BRIGHT-Flash 的 `model_total_s` 逐位相同（差值 < 1e-12）。
3. 基准跑在**另一台机器**（逐切片表中 `wsi_path = <bench-host>/DATA/Data/TMUCIH-F150/…`），不是 gpu03。**不能与 gpu03 上完整 pipeline 的 11.2 s（T5）/ 5.9 s（T10）直接比较。**

---

## 还缺什么才能变成"铁证"

| 缺口 | 影响 | 补救方式 |
|---|---|---|
| 1007 的 `test_predictions.csv` | 无法从预测独立重算 0.8622 | 若 NAS 上 `run_20261008_005212` 还在，可从该目录恢复 |
| `speed_bench` 原始运行目录 `<root>/<Model>/summary.json` | 无法核对 2.0796 的精确来源 | 本机已不存在，git 也无删除记录 → 只能重测 |
| gpu03 上的独立复测 | 2.08 只在一台机器测过 | 用同一 150 张切片在 gpu03 重跑一次基准 |

---

## 文件完整性

`MANIFEST.sha256` 记录全部 20 份副本的 SHA-256；`verify_output.txt` 末尾也打印了一份。

```bash
cd BRIGHT-Flash-ex && shasum -a 256 -c MANIFEST.sha256
```

两份 `.history` 快照、两份 `model_summary` 表的哈希分别相同，说明它们确实是同一内容的两处副本（不是两次不同的测量）。


---

## 发布备注 · 2026-11-09（BRIGHT 耗时重算）

本站把 BRIGHT 的单张模型耗时按用户口径重算为
`I/O 11.74 s +（BRIGHT 推理 21.04 s + Virchow2 推理 14.74 s）= 47.71 s`（端到端 50.14 s）。

本证据包中的 `files/speed_bench/model_summary.csv` 与 `files/visualizations/time_breakdown/…`
是**修订前**的测量快照（BRIGHT 33.0 s），保留原样，用于核对这两个推理分量各自的来源。
`BRIGHT-Flash-5x` 的 2.08 s 与 1007 的 0.8622 不受该修订影响，A/B 两组复核结论不变。
