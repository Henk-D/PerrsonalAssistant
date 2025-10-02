# 🎯 智能目标管理系统 - 打包和分发指南

## 📦 目录

1. [快速启动](#快速启动)
2. [macOS 打包方案](#macos-打包方案)
3. [Windows 打包方案](#windows-打包方案)
4. [跨平台分发](#跨平台分发)
5. [常见问题](#常见问题)

---

## 🚀 快速启动

### macOS 用户

**方法 1: 双击启动 (推荐)**
1. 双击 `启动应用.command` 文件
2. 首次运行会自动安装依赖（需要几分钟）
3. 应用会在浏览器中自动打开

**方法 2: 终端启动**
```bash
cd /path/to/PerrsonalAssistant
chmod +x 启动应用.command
./启动应用.command
```

### Windows 用户

**双击启动**
1. 双击 `启动应用.bat` 文件
2. 首次运行会自动安装依赖（需要几分钟）
3. 应用会在浏览器中自动打开

---

## 🍎 macOS 打包方案

### 方案 1: .command 文件（简单快速）

**特点：**
- ✅ 双击即可使用
- ✅ 自动管理依赖
- ✅ 无需额外工具
- ⚠️ 需要预装 Python 3

**使用方法：**
已经创建好了 `启动应用.command`，直接双击使用即可。

**分发方法：**
将整个项目文件夹压缩后分发：
```bash
# 创建分发包
cd /path/to/PerrsonalAssistant
zip -r "智能目标管理-Mac版.zip" . -x "*.pyc" -x "__pycache__/*" -x ".venv/*"
```

### 方案 2: .app 应用包（专业方案）

**特点：**
- ✅ 原生 macOS 应用体验
- ✅ 可添加到应用程序文件夹
- ✅ 可自定义图标
- ⚠️ 需要 Python 3 环境

**打包步骤：**

1. **运行打包脚本**
```bash
cd /path/to/PerrsonalAssistant
./build_mac_app.sh
```

2. **测试应用**
```bash
# 双击 "智能目标管理.app" 测试
open "智能目标管理.app"
```

3. **添加自定义图标（可选）**
- 准备一个 512x512 的 PNG 图标
- 使用 `Image2Icon` 或在线工具转换为 .icns 格式
- 将图标文件命名为 `AppIcon.icns`
- 复制到 `智能目标管理.app/Contents/Resources/`

4. **分发应用**
```bash
# 压缩 .app 包
zip -r "智能目标管理-Mac版.zip" "智能目标管理.app"
```

### 方案 3: 完全独立的应用（高级）

如需创建完全独立、无需 Python 的应用，可以使用 PyInstaller：

```bash
# 1. 安装 PyInstaller
pip install pyinstaller

# 2. 创建独立应用
pyinstaller --name="智能目标管理" \
    --windowed \
    --onefile \
    --add-data "goal-planner-python.py:." \
    --hidden-import=streamlit \
    --hidden-import=anthropic \
    --hidden-import=openai \
    goal-planner-python.py

# 3. 应用位于 dist/ 目录
```

**注意：** 此方法生成的应用较大（约 100-200MB）

---

## 🪟 Windows 打包方案

### 方案 1: .bat 批处理文件（简单快速）

**特点：**
- ✅ 双击即可使用
- ✅ 自动管理依赖
- ✅ 无需额外工具
- ⚠️ 需要预装 Python 3

**使用方法：**
已经创建好了 `启动应用.bat`，直接双击使用即可。

**分发方法：**
```batch
REM 创建分发包（在项目文件夹中）
powershell Compress-Archive -Path * -DestinationPath "智能目标管理-Windows版.zip" -Force
```

### 方案 2: .exe 可执行文件（专业方案）

**特点：**
- ✅ 真正的独立应用
- ✅ 无需安装 Python
- ✅ 专业的用户体验
- ⚠️ 文件较大（~200MB）

**打包步骤：**

1. **安装依赖**
```bash
pip install pyinstaller
```

2. **运行打包脚本**
```bash
python build_windows_exe.py
```

3. **测试应用**
- 进入 `dist/智能目标管理/` 文件夹
- 双击 `智能目标管理.exe` 测试

4. **创建安装包（可选）**

使用 Inno Setup 创建专业安装程序：

a. 下载并安装 [Inno Setup](https://jrsoftware.org/isdl.php)

b. 创建安装脚本 `installer.iss`：

```iss
[Setup]
AppName=智能目标管理系统
AppVersion=1.0
DefaultDirName={pf}\智能目标管理
DefaultGroupName=智能目标管理
OutputDir=installer
OutputBaseFilename=智能目标管理-Setup

[Files]
Source: "dist\智能目标管理\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\智能目标管理"; Filename: "{app}\智能目标管理.exe"
Name: "{commondesktop}\智能目标管理"; Filename: "{app}\智能目标管理.exe"

[Run]
Filename: "{app}\智能目标管理.exe"; Description: "启动应用"; Flags: postinstall nowait skipifsilent
```

c. 使用 Inno Setup Compiler 编译脚本，生成 `智能目标管理-Setup.exe`

---

## 🌍 跨平台分发

### 通用分发包（推荐给技术用户）

**优点：**
- 一个包支持所有平台
- 体积小
- 易于维护

**创建方法：**

1. **清理项目**
```bash
# 删除缓存和虚拟环境
rm -rf .venv __pycache__ *.pyc
```

2. **创建分发包**
```bash
# macOS/Linux
tar -czf "智能目标管理-v1.0-全平台.tar.gz" \
    goal-planner-python.py \
    requirements.txt \
    启动应用.command \
    启动应用.bat \
    README-PACKAGING.md

# 或使用 zip
zip -r "智能目标管理-v1.0-全平台.zip" \
    goal-planner-python.py \
    requirements.txt \
    启动应用.command \
    启动应用.bat \
    README-PACKAGING.md
```

3. **添加说明文档**

在压缩包中包含 `README.txt`：

```
智能目标管理系统 v1.0
====================

Mac 用户：
  双击 "启动应用.command"

Windows 用户：
  双击 "启动应用.bat"

首次运行：
  - 需要安装 Python 3.8 或更高版本
  - 会自动安装所需依赖（需要几分钟）
  - 应用会在浏览器中打开

系统要求：
  - Python 3.8+
  - 网络连接（用于首次安装依赖）
  - 现代浏览器（Chrome、Safari、Edge、Firefox）

更多信息：
  请查看 README-PACKAGING.md
```

### Docker 容器（高级用户）

**创建 Dockerfile：**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY goal-planner-python.py .

EXPOSE 8501

CMD ["streamlit", "run", "goal-planner-python.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true"]
```

**使用方法：**

```bash
# 构建镜像
docker build -t goal-planner .

# 运行容器
docker run -p 8501:8501 goal-planner

# 访问 http://localhost:8501
```

---

## ❓ 常见问题

### Q: Python 未安装怎么办？

**macOS:**
```bash
# 使用 Homebrew 安装
brew install python3

# 或从官网下载
# https://www.python.org/downloads/macos/
```

**Windows:**
- 从 https://www.python.org/downloads/windows/ 下载
- 安装时务必勾选 "Add Python to PATH"

### Q: 首次运行很慢？

A: 首次运行需要下载并安装依赖包（约 200MB），这是正常的。后续启动会很快。

### Q: 如何完全卸载？

**macOS/Linux:**
```bash
cd /path/to/PerrsonalAssistant
rm -rf .venv  # 删除虚拟环境
# 然后删除整个项目文件夹
```

**Windows:**
- 删除项目文件夹即可
- 虚拟环境在 `.venv` 文件夹中

### Q: 可以在没有网络的环境中使用吗？

A: 
- 首次安装需要网络下载依赖
- 安装完成后可以离线使用
- AI 功能需要网络连接（调用 API）

### Q: 如何更新到新版本？

1. 备份数据文件 `goal_planner_data.json`
2. 替换 `goal-planner-python.py`
3. 更新依赖：`.venv/bin/pip install -r requirements.txt --upgrade`

### Q: 在公司内网环境如何安装？

如果无法访问外网，可以：

1. **方法1：使用离线包**
```bash
# 在有网络的机器上打包依赖
pip download -r requirements.txt -d packages/

# 在内网机器上安装
pip install --no-index --find-links=packages/ -r requirements.txt
```

2. **方法2：使用内部 PyPI 镜像**
```bash
pip install -r requirements.txt -i http://your-internal-pypi/simple
```

### Q: 如何自定义端口？

编辑启动脚本，将 `8501` 改为其他端口：

**macOS (启动应用.command):**
```bash
.venv/bin/python -m streamlit run goal-planner-python.py --server.port=8502
```

**Windows (启动应用.bat):**
```batch
.venv\Scripts\python.exe -m streamlit run goal-planner-python.py --server.port=8502
```

---

## 📊 打包方案对比

| 方案 | macOS | Windows | 优点 | 缺点 | 推荐场景 |
|------|-------|---------|------|------|----------|
| .command/.bat | ✅ | ✅ | 简单、快速 | 需要 Python | 个人使用 |
| .app 包 | ✅ | ❌ | 原生体验 | 需要 Python | Mac 用户 |
| .exe 文件 | ❌ | ✅ | 独立、专业 | 文件大 | Windows 分发 |
| PyInstaller | ✅ | ✅ | 完全独立 | 文件大、复杂 | 商业分发 |
| Docker | ✅ | ✅ | 跨平台、隔离 | 需要 Docker | 服务器部署 |

---

## 🎨 进阶定制

### 添加应用图标

**macOS:**
1. 准备 512x512 PNG 图标
2. 转换为 .icns 格式
3. 替换 .app 包中的图标

**Windows:**
1. 准备 256x256 ICO 图标
2. 在 PyInstaller 命令中添加：
   ```bash
   --icon=icon.ico
   ```

### 添加启动画面

可以在启动脚本中添加欢迎信息或检查更新逻辑。

### 创建更新机制

可以添加自动更新检查功能，从 GitHub Releases 下载最新版本。

---

## 📝 版本历史

- **v1.0.0** (2025-10-02)
  - 初始版本
  - 支持多 AI 提供商
  - Mac/Windows 打包支持

---

## 📞 技术支持

如有问题，请：
1. 查看本文档的"常见问题"部分
2. 检查 GitHub Issues
3. 联系开发者

---

**祝使用愉快！🎯**
