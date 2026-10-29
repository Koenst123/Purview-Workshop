"""Run the required regression suite sequentially, with real process exit codes."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
sys.stdout.reconfigure(encoding="utf-8")
import tempfile

ROOT = Path(__file__).resolve().parent.parent
CASES = (
    "t_pw", "t_dnd", "t_core", "t_views_a", "t_views_b", "verify_core",
    "robust", "xss", "t_r4", "t_arch", "t_settings", "t_sits", "t_scn",
    "t_adopt", "t_ps", "t_exports_ps", "t_exports_xlsx", "t_exports_doc",
    "ps_injection", "t_decisions", "t_reliability", "t_experience", "t_quality", "t_tooling", "t_polish",
    "t_r8_arch", "t_r8_sitsdrag", "t_r8_master", "t_r8_dlp", "t_r8_scn", "t_r8_meten", "t_r8_start", "t_r8_focus",
    "t_labelfix",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--only", nargs="+", choices=CASES)
    args = parser.parse_args()
    out = (args.out or Path(tempfile.mkdtemp(prefix="pyd-tests-"))).resolve()
    if out == ROOT or ROOT in out.parents:
        parser.error("Testartefacten moeten buiten de repository staan.")
    out.mkdir(parents=True, exist_ok=True)
    app = args.app.resolve() if args.app else out / "app.html"
    if not args.app:
        subprocess.run([sys.executable, str(ROOT / "src" / "build.py"), str(app)], check=True)
    if not app.is_file():
        parser.error(f"App ontbreekt: {app}")
    cases = args.only or CASES
    failed = []
    for name in cases:
        folder = out / name
        folder.mkdir(exist_ok=True)
        command = [sys.executable, str(ROOT / "tests" / f"{name}.py"), str(app)]
        if name != "xss":
            command.append(str(folder))
        env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYD_TEST_OUT": str(folder)}
        with (out / f"{name}.log").open("w", encoding="utf-8") as log:
            try:
                result = subprocess.run(command, cwd=ROOT, env=env, stdout=log,
                                        stderr=subprocess.STDOUT, timeout=300)
                passed = result.returncode == 0
            except subprocess.TimeoutExpired:
                log.write("\nTEST MISLUKT: timeout\n")
                passed = False
        print(f"{name:22} {'OK' if passed else 'MISLUKT'}", flush=True)
        if not passed:
            failed.append(name)
            print("\n".join((out / f"{name}.log").read_text(encoding="utf-8").splitlines()[-15:]))
    print(f"\n{len(cases) - len(failed)}/{len(cases)} geslaagd; logs: {out}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
