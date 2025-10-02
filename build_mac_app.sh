#!/bin/bash
# 将 Streamlit 应用打包为 Mac .app 应用程序

APP_NAME="智能目标管理"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_PATH="$SCRIPT_DIR/$APP_NAME.app"

echo "📦 开始打包 macOS 应用..."

# 创建 .app 目录结构
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# 创建 Info.plist
cat > "$APP_PATH/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>com.goalplanner.app</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# 创建启动脚本
cat > "$APP_PATH/Contents/MacOS/launcher" << 'EOF'
#!/bin/bash

# 获取应用资源目录
RESOURCES="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../Resources" && pwd )"
cd "$RESOURCES"

# 检查并创建虚拟环境
if [ ! -d ".venv" ]; then
    osascript -e 'display notification "首次运行，正在安装依赖..." with title "智能目标管理"'
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip -q
    .venv/bin/pip install -r requirements.txt -q
fi

# 启动应用
osascript -e 'display notification "应用正在启动..." with title "智能目标管理"'

# 在后台启动 Streamlit
.venv/bin/python -m streamlit run goal-planner-python.py \
    --server.headless true \
    --server.port 8501 \
    --browser.gatherUsageStats false &

# 等待服务器启动
sleep 3

# 打开浏览器
open "http://localhost:8501"

# 等待进程
wait
EOF

# 复制应用文件到 Resources
cp goal-planner-python.py "$APP_PATH/Contents/Resources/"
cp requirements.txt "$APP_PATH/Contents/Resources/"

# 给启动脚本执行权限
chmod +x "$APP_PATH/Contents/MacOS/launcher"

echo "✅ 打包完成！"
echo "📱 应用位置: $APP_PATH"
echo ""
echo "💡 使用方法："
echo "   1. 双击 '$APP_NAME.app' 启动应用"
echo "   2. 首次启动会自动安装依赖（需要几分钟）"
echo "   3. 应用会在浏览器中自动打开"
echo ""
echo "📦 如需分发，可以将整个 .app 文件夹压缩后发送"
