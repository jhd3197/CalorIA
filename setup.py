#!/usr/bin/env python3
"""
Setup script for CalorIA CLI.

This script allows the CalorIA CLI to be installed as a package,
making the 'caloria' command available system-wide.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the README file for long description
readme_path = Path(__file__).parent / "README.md"
long_description = ""
if readme_path.exists():
    with open(readme_path, "r", encoding="utf-8") as fh:
        long_description = fh.read()

# Read requirements from backend requirements.txt
requirements_path = Path(__file__).parent / "CalorIA" / "backend" / "requirements.txt"
install_requires = []
if requirements_path.exists():
    with open(requirements_path, "r", encoding="utf-8") as fh:
        install_requires = [
            line.strip()
            for line in fh.readlines()
            if line.strip() and not line.startswith("#")
        ]

setup(
    name="caloria",
    version="1.0.0",
    author="Juan Denis",
    author_email="juan@vene.co",
    description="A comprehensive full-stack calorie tracking application with Flask backend, React frontend, and AI-powered features",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/jhd3197/CalorIA",
    packages=find_packages(),
    include_package_data=True,
    install_requires=install_requires,
    entry_points={
        "console_scripts": [
            "caloria=CalorIA.cli:cli",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: End Users/Desktop",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Scientific/Engineering :: Information Analysis",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
        "Framework :: Flask",
    ],
    python_requires=">=3.7",
    keywords="caloria nutrition calories tracking flask react mongodb ai",
    project_urls={
        "Bug Reports": "https://github.com/yourusername/CalorIA/issues",
        "Source": "https://github.com/yourusername/CalorIA",
        "Documentation": "https://github.com/yourusername/CalorIA#readme",
    },
)