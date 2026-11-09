import sys, io, csv, zstandard
src, dst = sys.argv[1], sys.argv[2]
n = k = 0
with open(src, 'rb') as f, open(dst, 'w', newline='') as out:
    r = csv.reader(io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f), encoding='utf-8', newline=''))
    w = csv.writer(out)
    hdr = next(r); w.writerow(hdr)
    ti = hdr.index('Themes')
    for row in r:
        n += 1
        if 'mateIn1' in row[ti].split(' '):
            w.writerow(row); k += 1
print('total rows', n, 'mateIn1 rows', k)
