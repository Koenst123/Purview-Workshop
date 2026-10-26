"""Parse the actual bundled JavaScript with Node; never executes the script."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

html = Path(sys.argv[1]).read_text(encoding="utf-8")
scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
if len(scripts) != 1:
    raise SystemExit("Expected exactly one inline script")
with tempfile.TemporaryDirectory(prefix="pyd-syntax-") as folder:
    script = Path(folder) / "bundle.js"
    script.write_text(scripts[0], encoding="utf-8")
    subprocess.run(["node", "--check", str(script)], check=True)
print("JavaScript syntax OK")
