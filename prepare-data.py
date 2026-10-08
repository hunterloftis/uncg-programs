import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parent
source = root / 'data'
degree_names = json.loads((source / 'degree-names.json').read_text())
field_names = json.loads((source / 'field-names.json').read_text())
earnings = list(csv.DictReader((source / 'pseo-earnings.csv').open()))
employment = {row['cipcode']: row for row in csv.DictReader((source / 'pseo-employment.csv').open())}


def published(row, field, status):
    return int(row[field]) if row[status] == '1' else None


def entry(row):
    cip = row['cipcode']
    degrees = [name['label'] for code, name in degree_names.items() if code.startswith(cip.replace('.', ''))]
    return {
        'cip': cip,
        'label': ' / '.join(degrees) if row['cip_level'] == '4' and degrees else field_names[cip],
        'source': field_names[cip],
        'q1': published(row, 'y5_p25_earnings', 'status_y5_earnings'),
        'median': published(row, 'y5_p50_earnings', 'status_y5_earnings'),
        'q3': published(row, 'y5_p75_earnings', 'status_y5_earnings'),
        'earningsCount': published(row, 'y5_grads_earn', 'status_y5_grads_earn'),
    }


programs = [entry(row) for row in earnings if row['cip_level'] == '4']
fields = []
for row in earnings:
    if row['cip_level'] != '2':
        continue
    field = entry(row)
    flow = employment[row['cipcode']]
    field.update({
        'kind': 'field',
        'observedCount': published(flow, 'y5_grads_emp', 'status_y5_grads_emp'),
        'residualCount': published(flow, 'y5_grads_nme', 'status_y5_grads_nme'),
    })
    fields.append(field)

data = {
    'release': 'R2026Q2',
    'cohort': '2016–2018',
    'yearsAfterGraduation': 5,
    'earningsYears': '2021–2023',
    'dollarsYear': 2023,
    'programs': programs,
    'fields': fields,
    'references': json.loads((source / 'high-school.json').read_text()),
}
(root / 'data.js').write_text('const earningsData = ' + json.dumps(data, indent=2, ensure_ascii=False) + ';\n')
