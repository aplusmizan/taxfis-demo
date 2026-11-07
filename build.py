#!/usr/bin/env python3
"""src/ altındaki parçalardan kdv-kontrol.html üretir (yayınlanan tek dosya)."""
import pathlib
r=pathlib.Path(__file__).parent
sh=(r/'src/kdv-kontrol.shell.html').read_text(encoding='utf-8')
b='\n'.join((r/'src'/f).read_text(encoding='utf-8') for f in ['oto-core.js','oto-xl.js','oto-ui.js','oto-aktar-ui.js'])
(r/'kdv-kontrol.html').write_text(sh.replace('/*@@OTO_BUNDLE@@*/',b),encoding='utf-8')
print('kdv-kontrol.html yazildi')
