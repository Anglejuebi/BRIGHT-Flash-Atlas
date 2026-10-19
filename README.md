# BRIGHT-Flash · 计算效率 × 精度图谱

静态单页仪表盘，白底学术风，简体中文。无需构建、无外部字体或网络依赖。

## 本地预览

直接双击 `index.html`，或在浏览器打开：

```bash
open -a "Google Chrome" index.html
```

## 发布到 GitHub Pages

1. 新建一个 **Public** 仓库，例如 `bright-flash-atlas`。
2. 把这个目录里的全部文件上传到仓库根目录，确保 `index.html` 在根目录。
3. 仓库 **Settings → Pages → Build and deployment**：
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
4. 保存后等待 1–2 分钟，访问：
   `https://<你的用户名>.github.io/bright-flash-atlas/`

也可以用命令行：

```bash
git init
git add .
git commit -m "Deploy BRIGHT-Flash atlas"
git branch -M main
git remote add origin https://github.com/<你的用户名>/bright-flash-atlas.git
git push -u origin main
```

## 数据与口径

- `sources/20_task_auc.csv`：20 任务 AUC 表
- `sources/17_task_auc.csv`：17 任务敏感性表
- `sources/time_auc_summary.csv`：耗时 / AUC 汇总
- `sources/time_per_slide_breakdown.csv`：时延拆分
- `sources/model_summary.csv`：GPU 峰值 / 吞吐
- `sources/1007_validation_test.json`：1007 验证与 held-out 测试汇总（已移除内部 NAS 路径）

注意：1007 的 2.08 s / 4.51 s 是沿用 BRIGHT-Flash 的声明式假设，不是新测；AUC 为 `best_validation`；17 任务视图排除了三个 NAT 队列。
