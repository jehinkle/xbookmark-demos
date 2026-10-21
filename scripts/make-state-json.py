import json,csv,glob
out={}
for l in open('b20002.dat'):
    if l.startswith('0500000US47'):
        p=l.strip().split('|'); out[p[0][9:]]={'fips':p[0][9:],'earn':int(p[1])}
for l in open('est23all.txt'):
    if l[:2]=='47' and l[3:6]!='  0':
        t=l.split(); f='47'+t[1].zfill(3)
        if f in out:
            out[f]['childPov']=float(t[11]); out[f]['name']=l[193:239].strip() if False else None
for r in csv.DictReader(open('atlas.csv')):
    if r['state']=='47':
        f='47'+r['county'].zfill(3)
        if f in out and r['kfr_pooled_pooled_p25']: out[f]['kfr']=round(float(r['kfr_pooled_pooled_p25'])*100,1)
for f in out:
    e={}
    for y in ('2019','2024'):
        for r in csv.DictReader(open(f'q/{y}-{f[2:]}.csv')):
            if r['own_code']=='0' and r['industry_code']=='10': e[y]=int(r['annual_avg_emplvl'])
    out[f]['emp2019'],out[f]['emp2024']=e['2019'],e['2024']
    out[f]['jobGrowth']=round((e['2024']/e['2019']-1)*100,1)
print(len(out),[k for k,v in out.items() if 'kfr' not in v or 'childPov' not in v])
import re
names={}
for l in open('est23all.txt'):
    if l[:2]=='47':
        m=re.search(r'([A-Z][A-Za-z .]+ County)',l)
        if m: names['47'+l.split()[1].zfill(3)]=m.group(1).replace(' County','')
for f in out: out[f]['name']=names[f]
print(list(out.values())[:2])
json.dump({'state':'Tennessee','abbr':'TN','fips':'47','counties':list(out.values())},open('tn.json','w'))
