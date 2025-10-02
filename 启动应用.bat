@echo off
chcp 65001 >nul
REM 智能目标管理系统 - Windows 启动脚本

title 智能目标管理系统
color 0A

echo.
echo ========================================
echo     🎯 智能目标管理系统
echo ========================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Python
    echo.
    echo 请从 https://www.python.org/downloads/ 下载并安装 Python 3
    echo 安装时请勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo ✅ 检测到 Python
python --version
echo.

REM 检查虚拟环境是否存在
if not exist ".venv\" (
    echo 📦 首次运行，正在创建虚拟环境...
    python -m venv .venv
    
    echo 📥 安装依赖包，请稍候...
    .venv\Scripts\python.exe -m pip install --upgrade pip -q
    .venv\Scripts\python.exe -m pip install -r requirements.txt -q
    
    echo ✅ 安装完成！
    echo.
)

REM 启动应用
echo 🚀 启动应用...
echo.
echo 📱 应用将在浏览器中自动打开
echo 💡 要停止应用，请关闭此窗口或按 Ctrl+C
echo.
echo ========================================
echo.

REM 启动 Streamlit
.venv\Scripts\python.exe -m streamlit run goal-planner-python.py

pause
