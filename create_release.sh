#!/bin/bash
# 快速创建分发包

echo "📦 创建应用分发包..."
echo ""

# 设置版本号
VERSION="1.0.0"
DATE=$(date +%Y%m%d)

# 创建分发目录
DIST_DIR="发布包"
mkdir -p "$DIST_DIR"

echo "1️⃣  创建简易跨平台版本..."
zip -q "$DIST_DIR/智能目标管理-v${VERSION}-全平台.zip" \
    goal-planner-python.py \
    requirements.txt \
    启动应用.command \
    启动应用.bat \
    快速使用指南.md \
    README.md

SIZE=$(ls -lh "$DIST_DIR/智能目标管理-v${VERSION}-全平台.zip" | awk '{print $5}')
echo "   ✅ 完成 (大小: $SIZE)"

echo ""
echo "2️⃣  创建完整开发者版本..."
zip -q -r "$DIST_DIR/智能目标管理-v${VERSION}-开发者版.zip" \
    goal-planner-python.py \
    requirements.txt \
    setup.py \
    启动应用.command \
    启动应用.bat \
    build_mac_app.sh \
    build_windows_exe.py \
    README.md \
    README-PACKAGING.md \
    快速使用指南.md \
    分发清单.md \
    -x "*.pyc" -x "__pycache__/*" -x ".venv/*" -x "*.json"

SIZE=$(ls -lh "$DIST_DIR/智能目标管理-v${VERSION}-开发者版.zip" | awk '{print $5}')
echo "   ✅ 完成 (大小: $SIZE)"

echo ""
echo "3️⃣  生成版本信息..."
cat > "$DIST_DIR/版本说明.txt" << EOF
智能目标管理系统 v${VERSION}
发布日期: $(date +%Y-%m-%d)

【包含内容】

1. 智能目标管理-v${VERSION}-全平台.zip
   - 适用于: Mac + Windows
   - 需要: Python 3.8+
   - 大小: 最小
   - 推荐给: 普通用户

2. 智能目标管理-v${VERSION}-开发者版.zip
   - 适用于: 开发者和高级用户
   - 包含: 完整源码和打包脚本
   - 可以: 自定义打包

【快速开始】

Mac 用户:
  1. 解压 "全平台.zip"
  2. 双击 "启动应用.command"

Windows 用户:
  1. 解压 "全平台.zip"
  2. 双击 "启动应用.bat"

【更新内容】

v1.0.0 ($(date +%Y-%m-%d))
- ✨ 初始版本发布
- 🤖 支持 Claude、ChatGPT、通义千问、DeepSeek
- 📦 提供跨平台打包方案
- 📚 完整使用文档

【系统要求】

- Python 3.8 或更高版本
- 网络连接（用于AI功能）
- 现代浏览器

【获取 API Key】

- Claude: https://console.anthropic.com
- OpenAI: https://platform.openai.com  
- 通义千问: 阿里云控制台
- DeepSeek: https://platform.deepseek.com

【技术支持】

详细文档: README-PACKAGING.md
快速指南: 快速使用指南.md

【许可证】

MIT License

EOF

echo "   ✅ 完成"

echo ""
echo "=========================================="
echo "🎉 分发包创建完成！"
echo "=========================================="
echo ""
echo "📁 位置: $DIST_DIR/"
echo ""
ls -lh "$DIST_DIR/"
echo ""
echo "💡 下一步："
echo "   1. 测试分发包是否正常工作"
echo "   2. 上传到 GitHub Releases 或云盘"
echo "   3. 分享给用户"
echo ""
