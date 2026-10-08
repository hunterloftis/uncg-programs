import argparse
import csv
import io
import json
import zipfile
from pathlib import Path


MINIMUM_EARNINGS = 35 * 50 * 7.25
GROUPS = [('NC', 'North Carolina', 'nc'), ('US', 'U.S.', 'us')]


def records(path):
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.lower().endswith('.csv'):
                continue
            with archive.open(name) as source:
                rows = csv.reader(io.TextIOWrapper(source))
                columns = next(rows)
                required = ['AGEP', 'SCHL', 'SCH', 'ESR', 'WAGP', 'ADJINC', 'PWGTP', 'STATE']
                indexes = [columns.index(column) for column in required]
                for row in rows:
                    age, education, school, employment, wages, adjustment, weight, state = [row[i] for i in indexes]
                    if not (25 <= int(age) <= 34 and education in ('16', '17') and school == '1' and employment in ('1', '2', '3', '6')):
                        continue
                    yield int(wages), int(adjustment), int(weight), state


def reference(values, label, name, code):
    qualifying = sorted(
        (wages * adjustment / 1_000_000, weight)
        for wages, adjustment, weight in values if wages >= MINIMUM_EARNINGS
    )
    observed_count = sum(weight for _, weight in qualifying)
    total_count = sum(weight for _, _, weight in values)
    quartiles = []
    cumulative = 0
    for earnings, weight in qualifying:
        cumulative += weight
        while len(quartiles) < 3 and cumulative >= observed_count * (len(quartiles) + 1) / 4:
            quartiles.append(round(earnings))
    if len(quartiles) != 3:
        raise ValueError(f'No qualifying earnings for {name}')
    return {
        'kind': 'reference',
        'cip': f'hs-{code}',
        'label': f'High school graduates — {name}',
        'shortLabel': f'{label} HS',
        'q1': quartiles[0],
        'median': quartiles[1],
        'q3': quartiles[2],
        'sampleCount': len(qualifying),
        'totalSampleCount': len(values),
        'populationEstimate': total_count,
        'observedCount': observed_count,
        'residualCount': total_count - observed_count,
        'minimumEarnings': MINIMUM_EARNINGS,
        'minimumEarningsBasis': 'before inflation adjustment',
        'dollarsYear': 2023,
        'period': '2019–2023',
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Rebuild high school estimates from the Census 2019–2023 national ACS person ZIP.')
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    values = {'NC': [], 'US': []}
    for wages, adjustment, weight, state in records(args.source):
        values['US'].append((wages, adjustment, weight))
        if state == '37':
            values['NC'].append((wages, adjustment, weight))
    estimates = [reference(values[label], label, name, code) for label, name, code in GROUPS]
    destination = Path(__file__).resolve().parent / 'data' / 'high-school.json'
    destination.write_text(json.dumps(estimates, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(estimates, indent=2, ensure_ascii=False))
