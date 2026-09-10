"""Create a source handoff without dependencies, credentials or build caches."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
output = root / 'artifacts/lock-in-source.zip'
roots = ['app', 'components', 'core', 'extension', 'scripts', 'tests', 'docs', 'public', '.github', '.openai', 'lib', 'hooks', 'agent-work', 'store-assets']
files = [p for name in roots for p in (root / name).rglob('*') if p.is_file()]
files += [p for p in root.iterdir() if p.is_file() and (p.suffix in {'.json', '.ts', '.mjs', '.md'} or p.name in {'LICENSE', '.gitignore'})]
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for p in sorted(set(files)):
        if '__pycache__' not in p.parts and not p.name.startswith('.env'):
            archive.write(p, Path('lock-in') / p.relative_to(root))
print(output)
