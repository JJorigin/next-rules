"""Compare the actual YAML fragment with the generated JS fragment."""
import json
from pathlib import Path
import subprocess
import yaml

root = Path(__file__).resolve().parent.parent
document = yaml.safe_load((root / "v2/next-rules.yaml").read_text(encoding="utf-8"))
if set(document) != {"proxy-groups", "rule-providers", "rules"}:
    raise ValueError("Remote routing must leave the subscription's resolver and network settings alone")
for name in ['next-rules.yaml', 'rules/next-rules.yaml']:
    if (root / name).read_bytes() != (root / 'v2/next-rules.yaml').read_bytes():
        raise ValueError('Current and compatibility entry points differ: ' + name)
for name in ['next-rules.js', 'rules/next-rules.js']:
    if (root / name).read_bytes() != (root / 'v2/next-rules.js').read_bytes():
        raise ValueError('Current and compatibility scripts differ: ' + name)
program = "const fs=require('node:fs'),vm=require('node:vm');const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('v2/next-rules.js','utf8'),ctx);process.stdout.write(JSON.stringify(ctx.remoteFragment()));"
script = json.loads(subprocess.check_output(["node", "-e", program], cwd=root))
if document != script:
    raise ValueError("YAML and JavaScript fragments differ")
output = root / ".cache/fragment.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")
print("YAML parsing and YAML/JS route equivalence passed.")
