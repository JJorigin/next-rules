"""Compare the actual YAML fragment with the generated JS fragment."""
import json
from pathlib import Path
import subprocess
import yaml

root = Path(__file__).resolve().parent.parent
document = yaml.safe_load((root / "v2/next-rules.yaml").read_text(encoding="utf-8"))
program = "const fs=require('node:fs'),vm=require('node:vm');const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('v2/next-rules.js','utf8'),ctx);process.stdout.write(JSON.stringify(ctx.remoteFragment()));"
script = json.loads(subprocess.check_output(["node", "-e", program], cwd=root))
if document != script:
    raise ValueError("YAML and JavaScript fragments differ")
output = root / ".cache/fragment.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")
print("YAML parsing and YAML/JS route equivalence passed.")
