#!/usr/bin/env python3
"""
智能目标管理系统 - Setup配置
"""

from setuptools import setup, find_packages

setup(
    name="goal-planner",
    version="1.0.0",
    description="智能目标管理系统 - AI驱动的目标规划与时间管理工具",
    author="Your Name",
    author_email="your.email@example.com",
    py_modules=['goal_planner_python'],
    install_requires=[
        'streamlit>=1.50.0',
        'anthropic>=0.69.0',
        'openai>=1.0.0',
        'requests>=2.31.0',
    ],
    python_requires='>=3.8',
    entry_points={
        'console_scripts': [
            'goal-planner=goal_planner_python:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: End Users/Desktop',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
    ],
)
