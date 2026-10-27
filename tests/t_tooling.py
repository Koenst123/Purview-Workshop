"""Regressie publicatie-tooling: tools/check.py moet fail-closed zijn als git niet werkt."""
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

with tempfile.TemporaryDirectory(prefix="pyd-check-") as tmp:
    fake = pathlib.Path(tmp)
    (fake / "tools").mkdir()
    shutil.copy(ROOT / "tools" / "check.py", fake / "tools" / "check.py")
    site = fake / "_site"
    site.mkdir()
    (site / "index.html").write_text("<html></html>", encoding="utf-8")
    env = {"PATH": str(pathlib.Path(sys.executable).parent), "GIT_CEILING_DIRECTORIES": tmp,
           "SYSTEMROOT": __import__("os").environ.get("SYSTEMROOT", ""), "PYTHONIOENCODING": "utf-8"}
    r = subprocess.run([sys.executable, str(fake / "tools" / "check.py"), str(site)],
                                  capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    out = r.stdout + r.stderr
    assert r.returncode == 1, f"check.py moet falen zonder git-repository (exit {r.returncode}):\n{out}"
    assert "git ls-files mislukt" in out, f"duidelijke git-foutmelding ontbreekt:\n{out}"

print("TOOLING OK: check.py fail-closed zonder git")
