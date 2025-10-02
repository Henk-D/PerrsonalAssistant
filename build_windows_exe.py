"""
Windows 打包脚本 - 创建独立可执行文件
使用 PyInstaller 将应用打包为 .exe 文件
"""

import os
import sys
import subprocess

def check_pyinstaller():
    """检查并安装 PyInstaller"""
    try:
        import PyInstaller
        print("✅ PyInstaller 已安装")
        return True
    except ImportError:
        print("📦 PyInstaller 未安装，正在安装...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
        return True

def create_launcher_script():
    """创建启动器脚本"""
    launcher_code = '''
import sys
import os
import subprocess
import webbrowser
import time
from pathlib import Path

def main():
    # 获取可执行文件所在目录
    if getattr(sys, 'frozen', False):
        app_dir = Path(sys._MEIPASS)
        base_dir = Path(sys.executable).parent
    else:
        app_dir = Path(__file__).parent
        base_dir = app_dir
    
    print("🎯 智能目标管理系统")
    print("=" * 50)
    print("🚀 正在启动应用...")
    
    # 启动 Streamlit
    streamlit_script = app_dir / "goal-planner-python.py"
    
    cmd = [
        sys.executable, "-m", "streamlit", "run",
        str(streamlit_script),
        "--server.headless", "true",
        "--server.port", "8501",
        "--browser.gatherUsageStats", "false"
    ]
    
    # 启动服务器
    proc = subprocess.Popen(cmd, 
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE,
                           creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
    
    # 等待服务器启动
    time.sleep(5)
    
    # 打开浏览器
    webbrowser.open("http://localhost:8501")
    
    print("✅ 应用已在浏览器中打开")
    print("💡 关闭此窗口将停止应用")
    
    # 等待进程结束
    proc.wait()

if __name__ == "__main__":
    main()
'''
    
    with open("launcher.py", "w", encoding="utf-8") as f:
        f.write(launcher_code)
    
    print("✅ 启动器脚本已创建")

def create_spec_file():
    """创建 PyInstaller spec 文件"""
    spec_content = '''
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('goal-planner-python.py', '.'),
        ('requirements.txt', '.'),
    ],
    hiddenimports=[
        'streamlit',
        'anthropic',
        'openai',
        'requests',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='智能目标管理',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='智能目标管理',
)
'''
    
    with open("app.spec", "w", encoding="utf-8") as f:
        f.write(spec_content)
    
    print("✅ Spec 文件已创建")

def build_exe():
    """构建可执行文件"""
    print("\n🔨 开始构建 Windows 可执行文件...")
    print("⏳ 这可能需要几分钟时间...\n")
    
    cmd = ["pyinstaller", "--clean", "app.spec"]
    subprocess.run(cmd, check=True)
    
    print("\n✅ 构建完成！")
    print(f"📦 可执行文件位于: dist/智能目标管理/")
    print("\n💡 使用方法:")
    print("   1. 将 'dist/智能目标管理' 文件夹复制到任何位置")
    print("   2. 双击 '智能目标管理.exe' 启动应用")
    print("   3. 应用会在浏览器中自动打开")

def main():
    print("=" * 60)
    print("  🎯 智能目标管理系统 - Windows 打包工具")
    print("=" * 60)
    print()
    
    # 检查依赖
    if not check_pyinstaller():
        print("❌ PyInstaller 安装失败")
        return
    
    # 创建必要文件
    create_launcher_script()
    create_spec_file()
    
    # 询问是否开始构建
    response = input("\n📦 是否开始构建可执行文件? (y/n): ")
    if response.lower() == 'y':
        try:
            build_exe()
        except Exception as e:
            print(f"\n❌ 构建失败: {e}")
    else:
        print("❌ 构建已取消")
        print("💡 稍后可以运行: pyinstaller --clean app.spec")

if __name__ == "__main__":
    main()
