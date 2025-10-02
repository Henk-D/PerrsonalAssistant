#!/bin/bash
# 智能目标管理系统 - Mac 启动脚本

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🎯 智能目标管理系统"
echo "================================"

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未检测到 Python 3"
    echo "请从 https://www.python.org/downloads/ 下载并安装 Python 3"
    read -p "按任意键退出..."
    exit 1
fi

echo "✅ 检测到 Python $(python3 --version)"

# 检查虚拟环境是否存在
if [ ! -d ".venv" ]; then
    echo "📦 首次运行，正在创建虚拟环境..."
    python3 -m venv .venv
    
    echo "📥 安装依赖包..."
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
    
    echo "✅ 安装完成！"
fi

# 激活虚拟环境并启动应用
echo "🚀 启动应用..."
echo ""
echo "📱 应用将在浏览器中自动打开"
echo "💡 要停止应用，请关闭此终端窗口或按 Ctrl+C"
echo ""

# 启动 Streamlit
.venv/bin/python -m streamlit run goal-planner-python.py

# 保持窗口打开
read -p "按任意键退出..."
