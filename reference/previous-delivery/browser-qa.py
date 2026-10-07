"""Compatibility entrypoint for the current v0.2 companion suite."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("browser-qa-v2.py")), run_name="__main__")
