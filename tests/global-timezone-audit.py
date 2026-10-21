"""SMV ASTRO: all IANA database zone IDs vs separately maintained tzdata 2026e.
Usage: pip install tzdata==2026.5 && python tests/global-timezone-audit.py
The reference uses Python zoneinfo and explicitly pinned IANA tzdata.
The production candidate is imported in a separate Node.js process.
"""
import collections
import importlib.resources
import json
import math
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timedelta, timezone
import tzdata
from zoneinfo import ZoneInfo, available_timezones, reset_tzpath

assert tzdata.IANA_VERSION == '2026e', f'Expected tzdb 2026e, got {tzdata.IANA_VERSION}'
reset_tzpath([str(importlib.resources.files(tzdata).joinpath('zoneinfo'))])
BASE=Path(__file__).resolve().parents[1]
ART=BASE/'timezone-audit-output'
ART.mkdir(exist_ok=True)
zones=sorted(available_timezones())
records=[]; expected=[]; kinds=[]; seen=set()

def expected_offset(zone,local):
    time_zone=ZoneInfo(zone)
    choices={}
    for fold in (0,1):
        dt=local.replace(tzinfo=time_zone,fold=fold)
        utc=dt.astimezone(timezone.utc)
        wall=utc.astimezone(time_zone).replace(tzinfo=None)
        if wall==local:
            choices[utc]=dt.utcoffset().total_seconds()/60
    if not choices:
        return None   # nonexistent wall time during a forward clock change
    return choices[min(choices)]  # earlier actual instant of repeated hour

def add(zone,dt,kind):
    triplet=[zone,dt.strftime('%Y-%m-%d'),dt.strftime('%H:%M')]
    key=tuple(triplet)
    if key in seen:return
    seen.add(key)
    records.append(triplet)
    expected.append(expected_offset(zone,dt))
    kinds.append(kind)

for zone in zones:
    for month in range(1,13):
        add(zone,datetime(2026,month,15,12),'2026-monthly')
    for year in (1800,1850,1900,1945,1970,1990,2000,2020,2025,2030,2050,2100,2399):
        for month in (1,7):
            add(zone,datetime(year,month,15,12),f'historical-{year}')

transitions=0
for zone in zones:
    tz=ZoneInfo(zone)
    a=datetime(2025,12,31,tzinfo=timezone.utc)
    end=datetime(2027,1,2,tzinfo=timezone.utc)
    step=timedelta(hours=12)
    last=a.astimezone(tz).utcoffset()
    b=a+step
    while b<=end:
        new=b.astimezone(tz).utcoffset()
        if new!=last:
            lo=a;hi=b
            while hi-lo>timedelta(minutes=1):
                mid=lo+(hi-lo)/2
                if mid.astimezone(tz).utcoffset()==last:lo=mid
                else:hi=mid
            instant=hi.replace(second=0,microsecond=0)
            transitions+=1
            for delta in range(-120,121,15):
                wall=(instant+timedelta(minutes=delta)).astimezone(tz).replace(tzinfo=None)
                add(zone,wall,'2026-transition-window')
            before=(instant-timedelta(seconds=1)).astimezone(tz).utcoffset()
            after=(instant+timedelta(seconds=1)).astimezone(tz).utcoffset()
            wall_before=(instant+before).replace(tzinfo=None)
            wall_after=(instant+after).replace(tzinfo=None)
            low=min(wall_before,wall_after);high=max(wall_before,wall_after)
            if high-low<=timedelta(hours=4):
                t=low
                while t<high:
                    add(zone,t,'2026-dst-gap-or-fold')
                    t+=timedelta(minutes=15)
        a=b;last=new;b+=step

probe=BASE/'tests/global-timezone-probe.mjs'
res=subprocess.run(
    ['node',str(probe)],input=json.dumps(records),text=True,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=180
)
if res.returncode:
    print(res.stderr,file=sys.stderr)
    raise SystemExit('Production timezone probe crashed')
out=json.loads(res.stdout)
actual=out['results']
assert len(actual)==len(records)
pass_by_kind=collections.Counter()
fail_by_kind=collections.Counter()
fail_by_zone=collections.Counter()
unsupported=collections.Counter()
non_location_placeholders=collections.Counter()
failure_examples=[]
for triplet,kind,want,got in zip(records,kinds,expected,actual):
    if isinstance(got,dict) and 'Invalid time zone specified' in got.get('error',''):
        if triplet[0]=='Factory':
            # IANA tzdb includes this test-data placeholder, not a real civil timezone.
            non_location_placeholders[triplet[0]]+=1
        else:
            unsupported[triplet[0]]+=1
        continue
    valid=(isinstance(got,(int,float)) and want is not None and abs(got-want)<1e-8)
    valid=valid or (isinstance(got,dict) and want is None and 'did not exist' in got.get('error',''))
    if valid:
        pass_by_kind[kind]+=1
    else:
        fail_by_kind[kind]+=1
        fail_by_zone[triplet[0]]+=1
        if len(failure_examples)<200:
            failure_examples.append({'case':triplet,'kind':kind,'expected_minutes':want,'actual':got})
passed=sum(pass_by_kind.values())
failed=sum(fail_by_kind.values())
report={
 'reference':'IANA tzdb '+tzdata.IANA_VERSION+' (Python tzdata '+getattr(tzdata,'__version__','n/a')+')',
 'productionNode':out['node'],'productionICU':out['icu'],'productionTZDB':out['tz'],
 'zone_ids_in_reference':len(zones),'zone_ids_nonlocation_placeholders':len(non_location_placeholders),
 'zones_checked':len(zones)-len(unsupported)-len(non_location_placeholders),
 'detected_2026_transitions':transitions,'test_inputs':len(records),
 'passed':passed,'failed':failed,'unsupported_case_count':sum(unsupported.values()),
 'non_location_placeholder_cases':sum(non_location_placeholders.values()),
 'pass_by_category':dict(pass_by_kind),'fail_by_category':dict(fail_by_kind),
 'zones_with_disagreement':dict(fail_by_zone.most_common()),
 'unsupported':dict(unsupported),'excluded_placeholders':dict(non_location_placeholders),'failure_examples':failure_examples,
 'certified':failed==0 and not unsupported,
 'scope':'2026 monthly and transition samples; Jan/Jul 1800–2399 sample years, not every instant.',
 'limitations':'Tests Node runtime, not all users’ Android/Chrome ICU data, future government changes, or every city-to-IANA mapping.'
}
(ART/'audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
lines=[
 '# SMV ASTRO Worldwide IANA UTC Offset / DST Certification Audit',
 '',
 f'**Result: {"PASS" if report["certified"] else "NOT CERTIFIED — differences detected"}**',
 f'**Reference:** IANA tzdb {tzdata.IANA_VERSION}',
 f'**Candidate runtime:** Node {out["node"]} / ICU {out["icu"]} / embedded tzdb {out["tz"]}',
 f'**Zone IDs in reference:** {len(zones)} ({report["zones_checked"]} usable timezones checked; {len(non_location_placeholders)} non-timezone placeholder excluded)',
 f'**2026 detected clock transitions:** {transitions}',
 f'**Total test cases:** {len(records)}',
 f'**PASS:** {passed}; **FAIL:** {failed}; **Unsupported cases:** {sum(unsupported.values())}; **Non-location placeholder cases:** {sum(non_location_placeholders.values())}',
 '',
 '## Differences by category',
]
lines += [f'- {k}: {v}' for k,v in sorted(fail_by_kind.items())]
lines += ['', '## Most affected timezone IDs']
lines += [f'- {k}: {v}' for k,v in fail_by_zone.most_common(30)]
lines += ['', '## Unsupported IDs']
lines += [f'- {k}: {v}' for k,v in unsupported.items()]
lines += ['', '## Method and limits',
'Independent Python zoneinfo reference using pinned 2026e IANA data vs the checked-in JavaScript offsetMinutesAt engine; monthly noon samples, DST transition/gap/fold windows, and selected historical years.',
'The result does not certify all future legislation, all pre-1970 local historical evidence, all browser tzdb versions, city-to-zone identification, or every possible birth instant.']
(ART/'audit.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ('reference','productionNode','productionTZDB','zone_ids_in_reference','detected_2026_transitions','test_inputs','passed','failed','unsupported_case_count','fail_by_category','zones_with_disagreement','excluded_placeholders')},ensure_ascii=False))
if failed or unsupported:sys.exit(1)
