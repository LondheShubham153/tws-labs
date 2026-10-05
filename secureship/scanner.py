"""Static-only scanning of a public GitHub repo. Never builds or runs repo code."""
import json
import re
import subprocess
import tempfile
from pathlib import Path

URL_RE = re.compile(r"^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?(\.git)?/?$")
SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
HADOLINT_SEV = {"error": "HIGH", "warning": "MEDIUM", "info": "LOW", "style": "INFO"}
ENV = {
    "PATH": "/usr/local/bin:/usr/bin:/bin",
    "HOME": "/tmp",
    "GIT_TERMINAL_PROMPT": "0",
    "TRIVY_CACHE_DIR": "/tmp/trivy-cache",
}
MAX_FINDINGS = 200


class ScanError(Exception):
    pass


def valid_url(url: str) -> bool:
    return bool(URL_RE.match(url))


def _run(cmd, timeout):
    # Argument list, no shell: the URL can never be interpreted as a command.
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=ENV)


def _clone(url, dest):
    try:
        r = _run(["git", "clone", "--depth", "1", "--single-branch", "--", url, str(dest)], 60)
    except subprocess.TimeoutExpired:
        raise ScanError("Cloning timed out. The repo may be too large.")
    if r.returncode != 0:
        raise ScanError("Could not clone the repo. Is it public and is the URL correct?")


def _rel(path, root):
    try:
        return str(Path(path).resolve().relative_to(root))
    except ValueError:
        return str(path)


def _hadolint(root):
    out = []
    for df in list(root.rglob("Dockerfile*"))[:20]:
        if not df.is_file() or ".git" in df.parts:
            continue
        r = _run(["hadolint", "--format", "json", str(df)], 30)
        for f in json.loads(r.stdout or "[]"):
            code = f.get("code", "")
            out.append({
                "tool": "Hadolint", "severity": HADOLINT_SEV.get(f.get("level"), "INFO"),
                "title": f"{code}: {f.get('message', '')}",
                "location": f"{_rel(df, root)}:{f.get('line', '?')}",
                "fix": f"See https://github.com/hadolint/hadolint/wiki/{code}",
            })
    return out


def _gitleaks(root, tmp):
    report = tmp / "gitleaks.json"
    _run(["gitleaks", "detect", "--no-git", "--source", str(root), "--redact",
          "--report-format", "json", "--report-path", str(report), "--exit-code", "0"], 90)
    if not report.exists():
        return []
    return [{
        "tool": "Gitleaks", "severity": "HIGH",
        "title": f"Possible secret: {f.get('Description', f.get('RuleID', ''))}",
        "location": f"{f.get('File', '')}:{f.get('StartLine', '?')}",
        "fix": "Remove it, rotate the credential, and purge it from git history.",
    } for f in json.loads(report.read_text() or "[]")]


def _trivy(root, tmp):
    report = tmp / "trivy.json"
    _run(["trivy", "fs", "--quiet", "--scanners", "vuln,misconfig", "--format", "json",
          "--output", str(report), str(root)], 180)
    if not report.exists():
        return []
    out = []
    for res in json.loads(report.read_text()).get("Results", []):
        target = res.get("Target", "")
        for v in res.get("Vulnerabilities", []) or []:
            fixed = v.get("FixedVersion")
            out.append({
                "tool": "Trivy", "severity": v.get("Severity", "INFO"),
                "title": f"{v.get('VulnerabilityID')}: {v.get('PkgName')} {v.get('InstalledVersion')}",
                "location": target,
                "fix": f"Upgrade to {fixed}" if fixed else "No fixed version yet.",
            })
        for m in res.get("Misconfigurations", []) or []:
            out.append({
                "tool": "Trivy", "severity": m.get("Severity", "INFO"),
                "title": f"{m.get('ID')}: {m.get('Title')}",
                "location": target, "fix": m.get("Resolution", ""),
            })
    return out


def scan_repo(url: str) -> dict:
    if not valid_url(url):
        raise ScanError("Only public https://github.com/<owner>/<repo> URLs are supported.")
    findings, errors = [], []
    with tempfile.TemporaryDirectory(prefix="secureship-") as t:
        tmp = Path(t)
        root = (tmp / "repo")
        _clone(url, root)
        root = root.resolve()
        for name, fn in (("Hadolint", lambda: _hadolint(root)),
                         ("Gitleaks", lambda: _gitleaks(root, tmp)),
                         ("Trivy", lambda: _trivy(root, tmp))):
            try:
                findings += fn()
            except Exception as e:  # one failing tool must not kill the report
                errors.append(f"{name} failed: {type(e).__name__}")
    findings.sort(key=lambda f: SEV_ORDER.get(f["severity"], 9))
    counts = {s: sum(f["severity"] == s for f in findings) for s in SEV_ORDER}
    return {"repo": url, "counts": counts, "total": len(findings),
            "findings": findings[:MAX_FINDINGS], "errors": errors}
