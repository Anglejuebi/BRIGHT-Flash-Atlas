# 脱敏说明（发布副本）

本站是公开页面，因此发布到 `evidence/files/` 的副本**不包含**切片号与内部路径。原始目录
`BRIGHT-Flash-Pipeline/BRIGHT-Flash-ex/` 未改动，仍在本地保留。

## 替换了什么

| 对象 | 替换规则 |
|---|---|
| 切片号（`slide`、`wsi_path`、`feature_file`） | 真实切片号 → `S001 … S150`（按数值排序的顺序代号；两份逐切片表映射一致） |
| 本地工作区绝对路径 | → `<workspace>/…` |
| 集群用户目录 | → `<nas-home>/…` |
| 基准机器数据目录 | → `<bench-host>/…` |
| Windows 工程绝对路径 | → `<project-root>` |
| Windows 用户目录 | → `<home>` |

## 没有改动什么

- 所有数值列（`io_s`、`infer_s`、`total_s`、AUC、均值、中位数、极值等）逐字节保留；
- 行数（两份逐切片表各 1,200 行）与列结构；
- 文件相对路径、文件名、文件数量；
- 结论与缺口描述。

## 如何验证脱敏没有改变结论

证据包自带的复核脚本只读取数值，不依赖切片号：

```bash
cd evidence
python3 verify_evidence.py
```

在**发布副本**上的运行结果为 `RESULT: ALL CHECKS PASS`，输出保存在
`verify_output_published.txt`；原始证据上的运行输出为 `verify_output.txt`。
两者的 PASS/DIFF 行逐条相同。

## 哈希说明

`MANIFEST.sha256` 记录的是**发布副本**的 SHA-256（可逐文件校验）。原始未脱敏文件
的哈希清单见原目录的 `MANIFEST.sha256`，未随站点发布。
