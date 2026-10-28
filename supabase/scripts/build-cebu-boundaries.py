"""Build the pinned 2023-4q Cebu reference boundaries; preserve source geometry."""
import concurrent.futures
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
data = root / 'supabase/functions/api/data'
directory = json.loads((data / 'cebu-barangays.json').read_text(encoding='utf-8'))
cache = root / 'tmp/cebu-boundaries-2023'
cache.mkdir(parents=True, exist_ok=True)
base = 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/2023-4q/2023/geojson/municities/hires/'

def fetch(code):
    target = cache / (code + '.json')
    if not target.exists():
        subprocess.run(['curl.exe', '--fail', '--location', '--silent', '--show-error', '--retry', '2', '--max-time', '60', '--output', str(target), base + f'bgysubmuns-municity-{code}.0.1.json'], check=True)
    return json.loads(target.read_text(encoding='utf-8'))['features']

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    groups = list(pool.map(fetch, sorted({str(int(b['city_psgc'])) for b in directory})))
features = {str(int(f['properties']['adm4_psgc'])): f for group in groups for f in group}
shapes = []
for barangay in directory:
    geometry = features[str(int(barangay['psgc_code']))]['geometry']
    assert geometry and geometry['type'] in ('Polygon', 'MultiPolygon'), barangay['name']
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    points = [point for polygon in polygons for ring in polygon for point in ring]
    xs, ys = zip(*points)
    shapes.append({'psgc': barangay['psgc_code'], 'bbox': [min(xs), min(ys), max(xs), max(ys)], 'polygons': polygons})
assert len(shapes) == 1203
target = data / 'cebu-boundaries.json'
target.write_text(json.dumps(shapes, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'{len(shapes)} Cebu barangay boundaries, {target.stat().st_size:,} bytes')
