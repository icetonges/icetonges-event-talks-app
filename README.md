# BigQuery Release Explorer 🚀

BigQuery Release Explorer 是一个用于浏览、搜索、筛选 Google Cloud BigQuery 官方发布日志（Release Notes）并将其一键分享至 X (Twitter) 的现代 Web 应用程序。

项目基于 **Python Flask** 后端和 **原生 HTML5 / CSS3 / JavaScript (ES6)** 前端构建，采用免 API 密钥的 **Twitter Web Intent** 共享技术。

---

## ✨ 核心特性

1. **子更新日志精细解析 (Sub-Update Decomposition)**
   * 采用 `BeautifulSoup` 将 Google 官方按天聚合的更新（通常包含多项内容）以 `<h3>` 标签为界，自动切割为独立的 Feature、Announcement 等更新卡片，便于精准选择和单独推特分享。

2. **智能高效缓存机制 (5-Min Caching)**
   * 后端实现内存级别的 5 分钟数据缓存，避免短时间内重复向 Google 请求产生延迟或被限流。
   * 支持通过前端的 **Sync Feed（同步 Feed）** 按钮绕过缓存，强行发起远程更新抓取。
   * **灾备降级**：若 Google 服务器请求失败，后端会自动读取历史缓存进行兜底展示（降级运行），确保前台业务不中断。

3. **双重组合筛选系统**
   * **全局检索**：支持对更新日期、更新分类、更新正文 HTML 的秒级实时模糊匹配。
   * **分类标签过滤 (Filter Pills)**：根据抓取到的内容动态生成分类过滤标签（Feature、Announcement、Fix、Breaking等），并显示实时统计数量，支持多选组合过滤。

4. **高拟真推文编辑与预览看板 (Live Tweet Composer)**
   * **字数安全截断**：智能计算 `[分类] 日期 + 正文 + 链接 + 话题标签` 的总长度，自动在 280 字符阈值内进行防溢出截断，并添加 `...`。
   * **环形字符指示器**：SVG 圆环随着字符变多实时旋转变色（绿色 -> 黄色 -> 红色），超限时自动禁用发送按钮。
   * **高还原度 Mock 预览**：实时生成与 X/Twitter 平台样式高度一致的信息流预览卡片，包含头像占位符、账号标识、跳转链接和网页附件。

---

## 📁 目录结构

```text
bigquery_release_viewer/
├── app.py                  # Flask 主应用（XML解析、BeautifulSoup数据切割、内存缓存逻辑）
├── templates/
│   └── index.html          # 前端单页面 HTML 结构（侧边栏、骨架屏、推文编辑器与 X 预览）
├── static/
│   ├── css/
│   │   └── style.css       # 全局样式（暗黑毛玻璃主题、自适应网格、Twitter卡片样式、圆环动画）
│   └── js/
│       └── app.js          # 前端交互逻辑（状态管理、模糊搜索、推文长度计算、SVG偏移、分享跳转）
├── .gitignore              # Git 忽略文件（已配置 Python、venv 及 IDE 相关忽略项）
└── README.md               # 项目说明文档
```

---

## ⚙️ 快速启动指南

### 1. 环境准备
确保您的系统上已安装 Python 3.8 或更高版本。

### 2. 创建并激活虚拟环境
在项目根目录下打开终端：
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境 (Windows CMD)
.\venv\Scripts\activate.bat

# 激活虚拟环境 (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# 激活虚拟环境 (macOS/Linux)
source venv/bin/activate
```

### 3. 安装依赖包
在激活的虚拟环境中，使用 pip 安装 Flask、Requests 和 BeautifulSoup4：
```bash
pip install flask requests beautifulsoup4
```

### 4. 运行 Flask 运行服务器
启动开发服务器：
```bash
python app.py
```
终端会输出如下日志：
```text
 * Running on http://127.0.0.1:5000
```
现在，打开您的浏览器并访问 **[http://127.0.0.1:5000](http://127.0.0.1:5000)** 即可开始使用！

---

## 🔗 技术集成说明

* **数据源**：Google Cloud BigQuery 官方订阅源 - `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`
* **前台图标**：[Lucide Icons](https://lucide.dev/) (通过前端轻量 CDN 异步引入)。
* **推特集成**：采用 **Twitter Web Intent** 规范，前端将编辑完的推文内容转化为 URL 编码参数，并调用浏览器新标签页跳转至 `https://twitter.com/intent/tweet?text=...`，避开了申请昂贵的企业级 API Key 限制，确保个人或企业分享百分之百可用且无额度限制。
