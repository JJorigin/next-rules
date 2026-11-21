"""Archive the published entry points without changing the historical tags."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


records = []
historical_tags = ('v1.0', 'v1.1', 'v1.2', 'v1.3', 'v2.0', 'v2.1', 'v2.2', 'v2.3', 'v2.4')
for tag in historical_tags:
    names = set(git('ls-tree', '-r', '--name-only', tag).decode().splitlines())
    version = tag[1:]
    commit = git('rev-parse', tag + '^{}').decode().strip()
    directory = ROOT / 'old' / version
    directory.mkdir(parents=True, exist_ok=True)
    for suffix in ['yaml', 'js']:
        choices = ['v2/next-rules.' + suffix, 'rules/next-rules.' + suffix, 'next-rules.' + suffix]
        source = next((name for name in choices if name in names), None)
        if source is None:
            continue
        data = git('show', tag + ':' + source)
        output = directory / ('next-rules.' + suffix)
        output.write_bytes(data)
        records.append({'path': output.relative_to(ROOT).as_posix(), 'tag': tag, 'commit': commit,
                        'source': source, 'sha256': hashlib.sha256(data).hexdigest()})
    if 'README.md' in names:
        data = git('show', tag + ':README.md')
        output = directory / 'ORIGINAL_README.md'
        output.write_bytes(data)
        records.append({'path': output.relative_to(ROOT).as_posix(), 'tag': tag, 'commit': commit,
                        'source': 'README.md', 'sha256': hashlib.sha256(data).hexdigest()})
    (directory / 'README.md').write_text(
        '# Next-Rules ' + version + ' 历史归档\n\n'
        '当前主版本请使用[项目首页](../../README.md)。此目录保留历史发布文件，不再维护。\n\n'
        '[历史发布页](https://github.com/JJorigin/next-rules/releases/tag/' + tag + ') · '
        '[历史说明](ORIGINAL_README.md)\n\n'
        '历史说明中的 main 地址会指向当前主版本；需要旧版时请使用本目录文件或历史发布附件。\n',
        encoding='utf-8', newline='\n')
(ROOT / 'old' / 'manifest.json').write_text(json.dumps({'files': records}, indent=2) + '\n', encoding='utf-8')
(ROOT / 'old' / 'README.md').write_text(
    '# 历史版本\n\n当前版本的使用方法见[项目首页](../README.md)。\n\n'
    + '\n'.join('- [' + tag[1:] + '](' + tag[1:] + '/)' for tag in reversed(historical_tags))
    + '\n\n历史文件不再维护，仍可能引用会更新的远程数据。原发布标签和附件保持不变。\n',
    encoding='utf-8', newline='\n')
print(json.dumps({'archivedFiles': len(records), 'versions': len(historical_tags)}))
