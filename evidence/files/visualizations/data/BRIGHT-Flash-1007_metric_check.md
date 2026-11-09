# BRIGHT-Flash-1007 metric verification

Source: repository-root batch_summary.json. Metric: best_validation.macro_ovr_auc.
CSV values retain the source decimal precision. No held_out_test metric was imported.

| Source task | CSV task | Best epoch | Validation slides | Exact validation AUC | CSV equals JSON |
|---|---|---:|---:|---:|---|
| AR | AR (2) | 17 | 770 | 0.9292355371900827 | Yes |
| CK5/6 | CK5/6 (2) | 13 | 783 | 0.9182118035104253 | Yes |
| Histological Diagnosis (2) | Can. Det. (2) | 1 | 1995 | 0.9909985783682902 | Yes |
| EGFR | EGFR (2) | 4 | 756 | 0.8515144723360656 | Yes |
| ER | ER (2) | 6 | 786 | 0.9273751862891207 | Yes |
| HER2(2) | HER2 (2) | 19 | 687 | 0.8603089979327603 | Yes |
| Ki-67 | Ki-67 (2) | 7 | 766 | 0.9027391760854796 | Yes |
| N-stage | N stage (2) | 12 | 1402 | 0.7009004482469057 | Yes |
| NAT-pCR (all) | NAT-ALL (2) | 20 | 273 | 0.7431594860166288 | Yes |
| NAT-pCR (HR+) | NAT-HR+ (2) | 13 | 162 | 0.7435064935064936 | Yes |
| NAT-pCR (TNBC) | NAT-TNBC (2) | 10 | 29 | 0.9 | Yes |
| PR | PR (2) | 8 | 787 | 0.856735112936345 | Yes |
| TILs | TILs (2) | 3 | 1112 | 0.9449284658007733 | Yes |
| Nottingham Grading | Grading (3) | 9 | 927 | 0.8993541011532339 | Yes |
| HER2(3) | HER2 (3) | 11 | 688 | 0.7630684714403366 | Yes |
| Histological Diagnosis (10) | Histo. Diag. (10) | 13 | 1979 | 0.9838493628584916 | Yes |
| Histopathological Subtyping (6) | Histo. Sub. (6) | 8 | 1267 | 0.8868885372439803 | Yes |
| Histopathological Subtyping (3) | IBC Sub. (3) | 13 | 1268 | 0.8872007294971397 | Yes |
| Molecular Subtyping | Mole. Sub. (4) | 16 | 668 | 0.8583781091707832 | Yes |
| pTNM-stage | pTNM (3) | 15 | 1227 | 0.6964997019972833 | Yes |

Mean over 20 tasks (Decimal arithmetic): 0.86224263857903097

Checks: all 20 task names and class counts, completion status, epoch counts, per-class mean/macro AUC agreement, confusion-matrix sample totals, unchanged historical CSV rows, exact new CSV numbers, and last-row placement.

The macro/per-class consistency check allows only binary floating-point summation error (absolute tolerance 1e-15). Raw validation predictions were not supplied, so ROC curves were not independently recomputed from predictions.

Timing: 1007 shares BRIGHT-Flash timings and phase profile by explicit user instruction. This is not a new benchmark.

All 27 PNGs were redrawn. The original pipeline pairwise ZIP and the new 1007 pairwise ZIP were rebuilt.
