// ---------- otomatik kontrol: ekran ve akış
const OZI=[['hesaplanan','Hesaplanan KDV'],['indirimler','İndirimler toplamı'],['devredenOnceki','Önceki dönemden devreden'],['odenecek','Ödenecek KDV'],['sonrakiDevreden','Sonraki döneme devreden'],['krediKarti','Beyandaki kredi kartı tutarı'],['zTop','Z raporu toplamı (KDV dahil)'],['zKdv','Z raporu KDV'],['pos','GİB POS toplamı (elle)']];
S.tid=0;S.up=null;S.sample=null;
function upFor(mid){if(!S.up||S.up.mid!==mid)S.up={mid,tablolar:[],ozet:{},beyan:null,msg:'',err:false,busy:false,yok:{}};if(!S.up.yok)S.up.yok={};return S.up}
const PAKET=[
  {k:'beyan',l:'KDV-1 beyannamesi (PDF)',yok:false,ok:(T,oz)=>T.has('beyan')||has(oz.hesaplanan)},
  {k:'kayit',l:'Mizan + muavin 191/391 (bilanço) ya da Defter-Beyan gelir-gider (şahıs)',yok:false,ok:T=>(T.has('mizan')&&T.has('muavin'))||T.has('defter'),ek:T=>T.has('mizan')&&!T.has('muavin')?'muavin eksik':T.has('muavin')&&!T.has('mizan')?'mizan eksik':''},
  {k:'satis',l:'GİB satış listesi (KDV ayrım raporu ya da giden e-arşiv/e-fatura)',yok:true,ok:T=>T.has('gib')||T.has('gib_satis')},
  {k:'alis',l:'GİB alış listesi (KDV ayrım raporu ya da gelen faturalar)',yok:true,ok:T=>T.has('gib')||T.has('gib_alis')},
  {k:'esmm',l:'e-SMM listesi (GİB portalı, alınan makbuzlar)',yok:true,ok:T=>T.has('esmm')},
  {k:'pusula',l:'Gider pusulası / satış iadesi dökümü',yok:true,ok:T=>T.has('pusula')},
  {k:'z',l:'Z raporları (yazar kasa / ÖKC)',yok:true,ok:(T,oz)=>T.has('z')||has(oz.zTop)},
  {k:'pos',l:'GİB POS toplamı (aşağıya elle yazılır)',yok:true,ok:(T,oz)=>has(oz.pos)},
  {k:'sonraki',l:'Sonraki ay da GİB\'den sorgulandı: e-Fatura/e-Arşiv alış ve e-SMM (ör. Eylül kontrolü için Ekim). GİB raporlanma tarihine göre getirir; geç raporlanan belgeler ancak sonraki ay sorgusunda düşer.',yok:false,onay:true,ok:(T,oz,u)=>!!u.sonraki}];
function paketDurum(mid){const u=upFor(mid);const f=S.firmalar[mid]||{};const fy=f.paketYok||{};const k=kDoc(mid)||{};const oz={...(k.ozet||{}),...u.ozet};
  const T=new Set(u.tablolar.filter(t=>t.tur!=='diger').map(t=>t.tur));
  return PAKET.map(p=>{const ok=p.ok(T,oz,u);const ek=!ok&&p.ek?p.ek(T):'';return{...p,ek,d:ok?'var':p.yok&&fy[p.k]?'firma':p.yok&&u.yok[p.k]?'ay':'eksik'}})}
function vPaket(mid){const P=paketDurum(mid);const eks=P.filter(p=>p.d==='eksik');
  return `<div class="paket" aria-label="Dosya paketi"><div class="paketbas"><b>Dosya paketi</b><span class="chip ${eks.length?'warn':'ok'}">${eks.length?eks.length+' eksik':'tamam'}</span></div>
  ${P.map(p=>`<div class="pk ${p.d}"><span class="pki" aria-hidden="true">${p.d==='var'?'✓':p.d==='eksik'?'!':'–'}</span><span class="pkl">${esc(p.l)}${p.ek?` <span class="muted">(${esc(p.ek)})</span>`:''}</span>
    <span class="pks">${p.d==='var'?(p.onay?'<span class="chip ok">onaylandı</span> <button class="ghost" data-pkgeri="sonraki">geri al</button>':'<span class="chip ok">yüklendi</span>'):p.d==='ay'?'<span class="chip">bu ay yok</span> <button class="ghost" data-pkgeri="'+p.k+'">geri al</button>':p.d==='firma'?'<span class="chip">bu firmada yok</span> <button class="ghost" data-pkgeri="'+p.k+'">geri al</button>':p.onay?'<button data-pksonraki="1">Sorguladım, onaylıyorum</button>':p.yok?'<button data-pkay="'+p.k+'">Bu ay yok</button> <button class="ghost" data-pkfirma="'+p.k+'">Bu firmada hiç yok</button>':'<span class="chip warn">zorunlu</span>'}</span></div>`).join('')}</div>`}
function vYukle(mid){const u=S.up&&S.up.mid===mid?S.up:null;const oz={...((kDoc(mid)||{}).ozet||{}),...(u?u.ozet:{})};
  const rows=u?u.tablolar.map(t=>{const ek=t.text!=null?[]:gerekli(t);return `<tr><td class="name">${esc(t.ad)}${t.sayfa?` <span class="muted">· ${esc(t.sayfa)}</span>`:''}</td>
    <td><select id="tur_${t.id}" data-tur="${t.id}" aria-label="Dosya türü">${TUR.map(([k,l])=>`<option value="${k}" ${t.tur===k?'selected':''}>${l}</option>`).join('')}</select></td>
    <td class="r num">${t.img?'Foto':t.text!=null?'PDF':Math.max(0,t.rows.length-t.hdr-1)}</td>
    <td>${t.img?(t.zOkundu?`<span class="chip ok">${esc(t.zOzet)}</span>`:'<span class="chip warn">Z toplamlarını elle yazın</span>'):t.tur==='diger'?'<span class="muted">kullanılmayacak</span>':t.tur==='beyan'?(t.okundu?'<span class="chip ok">tutarlar okundu</span>':'<span class="chip warn">tutarları elle yazın</span>'):ek.length?`<span class="chip warn">bulunamadı: ${esc(ek.join(', '))}</span>`:t.tur==='gib_alis'?'<span class="chip ok">alış olarak okundu</span>':t.tur==='gib_satis'?'<span class="chip ok">satış olarak okundu</span>':'<span class="chip ok">tamam</span>'}</td>
    <td><button class="ghost" data-tsil="${t.id}" aria-label="Dosyayı çıkar">✕</button></td></tr>`}).join(''):'';
  return `<div class="up"><div><h3>Dosyalar ve beyan tutarları</h3><div class="muted" style="font-size:12.5px">KDV-1 beyannamesi (PDF), mizan ve muavin (bilanço) ya da Defter-Beyan gelir-gider kayıtları (şahıs), KDV ayrım raporu, GİB e-arşiv ve e-SMM listeleri. Dosyalar yalnızca bu ekranda okunur, hiçbir yere kaydedilmez.</div></div>
  <label class="drop" id="drop" for="dosya"><input type="file" id="dosya" multiple accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,image/*"><b>Dosyaları seçin</b> <span class="muted">ya da buraya sürükleyin</span></label>
  ${u&&u.msg?`<div class="note${u.err?' err':''}">${esc(u.msg)}</div>`:''}${u&&u.uyari?`<div class="note err">${esc(u.uyari)}</div>`:''}
  ${rows?`<div class="tblwrap"><table class="grid"><thead><tr><th>Dosya</th><th>Tür</th><th class="r">Satır</th><th>Okuma</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:''}
  <div class="ozgrid">${OZI.map(([c,l])=>`<div class="f"><label class="sm" for="oz_${c}">${l}</label><input type="text" inputmode="decimal" id="oz_${c}" data-oz="${c}" value="${has(oz[c])?tl(oz[c]):''}" placeholder="0,00"${c==='pos'?' class="posin"':''}></div>`).join('')}</div>
  ${vPaket(mid)}
  ${(()=>{const e=paketDurum(mid).filter(p=>p.d==='eksik');return e.length?`<div class="note err">Kontrol için eksik: ${esc(e.map(p=>p.l.split(' (')[0]).join(', '))}. Dosyayı yükleyin ya da o ay gerçekten yoksa "yok" olarak işaretleyin.</div>`:''})()}
  <div class="actions"><button class="pri" data-calistir="1" ${u&&u.busy||paketDurum(mid).some(p=>p.d==='eksik')?'disabled':''}>${u&&u.busy?'Çalışıyor…':'Kontrolü çalıştır'}</button>${u&&u.tablolar.length?'<button data-temizle="1">Dosyaları temizle</button>':''}</div></div>`}
const n2=v=>v==null||v===''?'':tl(v);
function vTev(k){const T=k.tevkifat||[];if(!T.length)return '';const yi=T.filter(s=>!/^Yurt dışı/.test(s.tur)),yd=T.filter(s=>/^Yurt dışı/.test(s.tur));
  const durum=s=>`<span class="chip ${/tutarlı/.test(s.durum)?'ok':/yurt dışı/.test(s.durum)?'':'warn'}">${esc(s.durum)}</span>`;const sm=(a,f)=>a.reduce((x,s)=>x+(s[f]||0),0);
  const t1=yi.length?`<h3>Yurtiçi tevkifatlı alımlar</h3><div class="tblwrap"><table class="grid"><thead><tr><th>Belge</th><th>Karşı taraf</th><th class="r">Satıcıya ödenen KDV</th><th class="r">Tevkif (KDV-2)</th><th class="r">Toplam KDV</th><th>Oran</th><th class="r">GİB toplam KDV</th><th class="r">GİB tevkif</th><th>Durum</th></tr></thead><tbody>${yi.map(s=>`<tr><td class="num">${esc(s.no)}</td><td class="name">${esc(s.karsi)}</td><td class="r num">${n2(s.satici)}</td><td class="r num">${n2(s.tev)}</td><td class="r num">${n2(s.toplam)}</td><td class="num">${esc(s.oran)}${s.gibOran&&s.gibOran!==s.oran?` <span class="chip bad">GİB ${esc(s.gibOran)}</span>`:''}</td><td class="r num">${n2(s.gibKdv)}</td><td class="r num">${n2(s.gibTev)}</td><td>${durum(s)}</td></tr>`).join('')}<tr class="par"><td colspan="2"><b>Yurtiçi toplam (${yi.length} belge)</b></td><td class="r num"><b>${tl(sm(yi,'satici'))}</b></td><td class="r num"><b>${tl(sm(yi,'tev'))}</b></td><td class="r num"><b>${tl(sm(yi,'toplam'))}</b></td><td></td><td class="r num"><b>${tl(sm(yi,'gibKdv'))}</b></td><td class="r num"><b>${tl(sm(yi,'gibTev'))}</b></td><td></td></tr></tbody></table></div>`:'';
  const t2=yd.length?`<h3>Yurt dışından alınan hizmetler (KDV'nin tamamı sorumlu sıfatıyla)</h3><div class="tblwrap"><table class="grid"><thead><tr><th>Belge</th><th>Karşı taraf</th><th class="r">Sorumlu KDV (KDV-2)</th><th>Durum</th></tr></thead><tbody>${yd.map(s=>`<tr><td class="num">${esc(s.no)}</td><td class="name">${esc(s.karsi)}</td><td class="r num">${n2(s.tev)}</td><td>${durum(s)}</td></tr>`).join('')}<tr class="par"><td colspan="2"><b>Yurt dışı toplam (${yd.length} belge)</b></td><td class="r num"><b>${tl(sm(yd,'tev'))}</b></td><td></td></tr></tbody></table></div>`:'';
  const o=k.tevOzet||{};const top=sm(T,'tev');const satir=(ad,v,ref)=>v==null?'':`<tr><td>${ad}</td><td class="r num">${tl(v)}</td><td class="r num">${ref?tl(r2(v-top)):''}</td><td>${ref?`<span class="chip ${Math.abs(v-top)<0.01?'ok':Math.abs(v-top)<5?'warn':'bad'}">${Math.abs(v-top)<0.01?'Tutarlı':Math.abs(v-top)<5?'Kuruş farkı':'Fark var'}</span>`:''}</td></tr>`;
  const t3=`<h3>Genel toplam (net)</h3><div class="tblwrap"><table class="grid"><thead><tr><th>Kalem</th><th class="r">Tutar</th><th class="r">Fark</th><th>Durum</th></tr></thead><tbody>
    <tr><td>Yurtiçi tevkifat (KDV-2)</td><td class="r num">${tl(sm(yi,'tev'))}</td><td></td><td></td></tr><tr><td>Yurt dışı hizmet sorumlu KDV</td><td class="r num">${tl(sm(yd,'tev'))}</td><td></td><td></td></tr>
    <tr class="par"><td><b>Toplam sorumlu sıfatıyla KDV (belgelerden)</b></td><td class="r num"><b>${tl(top)}</b></td><td></td><td></td></tr>
    ${satir('Mizan · 191 sorumlu sıfatıyla hesabı',o.m109,1)}${satir('Mizan · 360 KDV-2 tahakkuku',o.m360,1)}${satir('KDV-1 beyanı · sorumlu sıfatıyla ödenen KDV',o.beyan,1)}
    ${yi.length?`<tr><td>Yurtiçi alımlarda satıcıya ödenen KDV (191 tevkifatsız kısımda)</td><td class="r num">${tl(sm(yi,'satici'))}</td><td></td><td></td></tr><tr class="par"><td><b>Tevkifatlı alımların toplam KDV'si (satıcı + tevkif)</b></td><td class="r num"><b>${tl(sm(yi,'toplam'))}</b></td><td></td><td></td></tr>`:''}
  </tbody></table></div>`;
  return t1+t2+t3}
function vSonuc(mid){const k=kDoc(mid);if(!k||!k.tablo)return '';const KOL=[['e-fatura','e-fatura'],['e-smm','e-smm'],['fis','fiş'],['e-arsiv','e-arşiv'],['tevkifat','tevkifat'],['gider','gider pusulası']];
  const tr=k.tablo.map(s=>{const kay=KOL.some(([c])=>s.src&&s.src[c]);const kotu=s.leaf&&kay&&Math.abs(s.fark)>=5;return `<tr class="${s.leaf?'':'par'}"><td class="num">${esc(s.kod)}</td><td class="name">${esc(s.ad)}</td><td class="r num">${n2(s.bb||null)}</td><td class="r num">${n2(s.ab||null)}</td>${KOL.map(([c])=>`<td class="r num src">${n2(s.src&&s.src[c])}</td>`).join('')}<td class="r num">${s.leaf?n2(s.toplam):''}</td><td class="r num ${kotu?'kfark':''}">${s.leaf?(kay||s.bakiye?n2(s.fark)||'0,00':''):''}</td></tr>`}).join('');
  const kr=(k.kars||[]).map(x=>`<tr><td class="name">${esc(x.ad)}</td><td class="r num">${n2(x.beyan)}</td><td class="r num">${n2(x.mizan)}</td><td class="r num">${n2(x.gib)}</td><td class="r num">${x.fark==null?'':tl(x.fark)}</td><td><span class="chip ${/^Fark var/.test(x.durum)?'bad':/Tutarlı/.test(x.durum)?'ok':x.durum?'warn':''}">${esc(x.durum||'')}</span></td></tr>`).join('');
  const acikK=(k.bulgular||[]).some(b=>b.seviye==='kirmizi'&&!b.duzeltildi);
  return `<div class="sonuc"><div class="sheethead"><div><h3>Kontrol tablosu</h3><div class="muted" style="font-size:12.5px">Kayıt (mizan veya işletme defteri) ve kaynak toplamları · fark = toplam − bakiye</div></div><div class="actions"><button class="pri" data-xlk="1">Excel indir (yazdırmaya hazır)</button></div></div>
  <div class="tblwrap"><table class="grid ktab"><thead><tr><th>Hesap</th><th>Hesap adı</th><th class="r">Borç bak.</th><th class="r">Alacak bak.</th>${KOL.map(([,l])=>`<th class="r">${l}</th>`).join('')}<th class="r">toplam</th><th class="r">fark</th></tr></thead><tbody>${tr||'<tr><td colspan="12" class="empty">Mizan veya defter kayıtları yüklenmediği için tablo boş. Bilanço firmasında mizan ve muavini, şahıs firmasında Defter-Beyan gelir-gider kayıtlarını yükleyin.</td></tr>'}</tbody></table></div>
  <h3>Beyanname karşılaştırması</h3>
  <div class="tblwrap"><table class="grid"><thead><tr><th>Kalem</th><th class="r">Beyanname</th><th class="r">Kayıt</th><th class="r">GİB</th><th class="r">Fark</th><th>Durum</th></tr></thead><tbody>${kr}</tbody></table></div>
  ${vTev(k)}
  <h3>Kritik notlar</h3><ol class="notlar">${(k.notlar||[]).map(n=>`<li>${esc(n)}</li>`).join('')}</ol>
  <div class="note ${acikK||/^Kontrol eksik/.test(k.sonuc||'')?'err':'okn'}"><b>Sonuç:</b> ${esc(k.sonuc||'')}</div></div>`}
async function pdfMetin(f){const lib=window.pdfjsLib;if(!lib)throw new Error('PDF okuyucu yüklenemedi');
  const doc=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;let out='';
  for(let p=1;p<=Math.min(doc.numPages,12);p++){const c=await(await doc.getPage(p)).getTextContent();
    const it=c.items.filter(i=>i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],s:i.str})).sort((a,b)=>b.y-a.y||a.x-b.x);
    const L=[];for(const i of it){const l=L[L.length-1];if(l&&Math.abs(l.y-i.y)<=6)l.it.push(i);else L.push({y:i.y,it:[i]})}
    out+=L.map(l=>l.it.sort((a,b)=>a.x-b.x).map(x=>x.s).join(' ')).join('\n')+'\n'}
  return out}
async function dosyaOku(f){const ext=f.name.split('.').pop().toLowerCase();
  if(ext==='pdf')return [{ad:f.name,sayfa:'',tur:'beyan',text:await pdfMetin(f),rows:[],hdr:0}];
  if(/^image\//.test(f.type)||/^(jpe?g|png|webp|heic)$/.test(ext))return [{ad:f.name,sayfa:'',tur:'z',img:f,rows:[],hdr:0}];
  if(!window.XLSX)throw new Error('Excel okuyucu yüklenemedi');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});
  return wb.SheetNames.map(sn=>({ad:f.name,sayfa:wb.SheetNames.length>1?sn:'',rows:XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:''})})).filter(t=>t.rows.length>1)}
async function beyanClaude(text){if(!S.sample)return null;
  const p=`Aşağıdaki KDV-1 beyannamesi metninden tutarları sayı olarak çıkar. Yalnızca JSON ver, bulamadığını yazma:
{"hesaplanan":0,"indirimler":0,"devredenOnceki":0,"odenecek":0,"sonrakiDevreden":0,"krediKarti":0,"sorumlu":0,"donem":"YYYY/AA","matrah":{"10":0},"hkdv":{"10":0},"ikdv":{"10":0}}
matrah ve hkdv: oranlara göre matrah ve hesaplanan KDV; ikdv: bu döneme ait indirilecek KDV'nin oranlara göre dağılımı.

METİN:
${text.slice(0,20000)}`;
  try{return await S.sample.json(p,{modelTier:'default'})}catch{return null}}
function beyanUygula(u,b,t){const o={};for(const c of OZK){const v=typeof b[c]==='string'?num(b[c]):b[c];if(has(v))o[c]=r2(v)}
  Object.assign(u.ozet,o);u.beyan={...b,matrah:b.matrah||{},hkdv:b.hkdv||{},ikdv:b.ikdv||{}};t.okundu=has(o.hesaplanan);
  u.uyari=b.donem&&String(b.donem)!==S.donem?`Beyanname ${b.donem} dönemine ait görünüyor, seçili dönem ${S.donem}. Üstten doğru dönemi seçin.`:''}
async function zOku(u,zi){
  const p=`Bu fotoğraflar yazar kasa (ödeme kaydedici cihaz) Z raporlarıdır: aylık mali rapor, mali hafıza raporu veya tek tek Z raporu olabilir. Fotoğraflar aynı şeridin parçaları olabilir; aynı Z'yi iki kez sayma. Birden fazla cihaza ait rapor olabilir (başlıktaki işyeri bilgisi, Z numara serisi veya rapor türü farklıdır); her cihazı ayrı rapor olarak ver.
Bazı fotoğraflarda rakam sütunu etiketlerden bir satır kaymış olabilir; her Z'nin tarih, toplam ve KDV'sini o Z'ye ait değerlerden al.
Her Z için: zNo, tarih (GG.AA.YYYY), fisAdedi, top (TOP veya TOPLAM, KDV dahil), kdv (KDV veya TOPKDV). Z 0000 gibi açılış satırlarını alma.
Raporun sonundaki dönem toplamını (TOP/TOPLAM ve KDV/TOPKDV) "toplam" olarak ver. A.TOP, KÜM TOP, KÜ.TOP gibi kümülatif değerleri ALMA.
Raporda KDV oranlarına göre dağılım varsa "oranlar" olarak ver, yoksa boş bırak. Okuyamadığın rakamı tahmin etme, null yaz. Tutarları nokta ondalıklı sayı olarak yaz (1.330,00 → 1330.00).
Yalnızca JSON ver:
{"raporlar":[{"cihaz":"1","zler":[{"zNo":"1917","tarih":"17.09.2026","fisAdedi":5,"top":735.00,"kdv":66.83}],"toplam":{"top":19232.00,"kdv":1748.40},"oranlar":[]}]}`;
  try{const lim=await S.sample.limits().catch(()=>null);if(!lim||!lim.images){u.msg='Bu görünümde fotoğraf okunamıyor.';return false}
    const res=await S.sample.json(p,{images:zi.map(t=>t.img).slice(0,lim.images.maxCount),modelTier:'complex'});
    const rap=Array.isArray(res&&res.raporlar)?res.raporlar:res&&res.zler?[{cihaz:'1',zler:res.zler,toplam:res.toplam,oranlar:res.oranlar}]:[];
    const tek=[],orn=[];let top=0,kdv=0;
    rap.forEach((r,i)=>{const cz=String(r.cihaz||i+1);const seen=new Set();const zs=(Array.isArray(r.zler)?r.zler:[]).filter(z=>z&&(z.zNo||z.tarih)&&parseInt(z.zNo,10)!==0).filter(z=>{const k=String(z.zNo||z.tarih);if(seen.has(k))return false;seen.add(k);return true}).map(z=>({...z,cihaz:cz}));
      tek.push(...zs);const t=r.toplam||{};top+=num(t.top)?num(t.top):zs.reduce((s,z)=>s+num(z.top),0);kdv+=num(t.kdv)?num(t.kdv):zs.reduce((s,z)=>s+num(z.kdv),0);if(Array.isArray(r.oranlar))orn.push(...r.oranlar.filter(x=>x&&num(x.kdv)))});
    top=r2(top);kdv=r2(kdv);if(!tek.length&&!top)return false;
    u.z={zler:tek,toplam:{top,kdv},oranlar:orn,cihaz:rap.length};
    u.ozet.zTop=top;u.ozet.zKdv=kdv;zi.forEach(x=>{x.zOkundu=true;x.zOzet=`${rap.length>1?rap.length+' cihaz · ':''}${tek.length} Z · ${tl(top)} / KDV ${tl(kdv)}`});return true}
  catch(e){return false}}
async function dosyalarEkle(files){const mid=S.sec;if(!mid||!files.length)return;const u=upFor(mid);if(u.busy)return;u.busy=true;u.err=false;u.msg='Dosyalar okunuyor…';render();
  try{const hata=[];
    for(const f of files){try{for(const t of await dosyaOku(f)){t.id=++S.tid;if(t.text==null&&!t.img)hazirla(t);u.tablolar.push(t);
      if(t.text!=null){let b=beyanOku(t.text);if(!has(b.hesaplanan)&&S.sample){u.msg='Beyanname standart biçimde değil; Claude tutarları okuyor…';render();b=(await beyanClaude(t.text))||b}beyanUygula(u,b,t)}}}
      catch(e){hata.push(f.name)}}
    const zi=u.tablolar.filter(t=>t.img&&!t.zOkundu);if(zi.length){if(S.sample){u.msg=`Claude ${zi.length} Z raporu fotoğrafını okuyor. Bu bir dakika kadar sürebilir…`;render();const ok=await zOku(u,zi);if(!ok)hata.push('Z raporu fotoğrafı (tutarları elle yazın)')}else hata.push('Z raporu fotoğrafı: bu görünümde okunamıyor, Z toplamlarını elle yazın')}
    u.err=hata.length>0;u.msg=hata.length?`Okunamayan dosya: ${hata.join(', ')}. Diğerleri hazır.`:'Dosyalar hazır. Türleri ve beyan tutarlarını gözden geçirin, GİB POS toplamını yazın, sonra kontrolü çalıştırın.'}
  finally{u.busy=false;render()}}
function oncekiDoc(mid){const [y,m]=S.donem.split('/').map(Number);const d=new Date(y,m-2,1);return S.kontroller[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}_${mid}`]}
async function calistir(){const mid=S.sec;const u=upFor(mid);if(u.busy)return;u.busy=true;u.err=false;u.msg='Kontrol çalışıyor…';render();
  try{const k=kDoc(mid)||{};const o={...(k.ozet||{}),...u.ozet};for(const c of Object.keys(o))if(!has(o[c]))delete o[c];
    const bey=u.beyan||k.beyanDetay||null;
    const tabs=u.tablolar.length?u.tablolar:[];const PD=paketDurum(mid);const eks=PD.filter(p=>p.d==='eksik');if(eks.length){u.err=true;u.msg='Dosya paketi eksik: '+eks.map(p=>p.l.split(' (')[0]).join(', ')+'.';return}
    const r=hesapla(tabs,o,oncekiDoc(mid),bey,u.z||k.zDetay||null,S.donem);const eski=k.bulgular||[];
    {const pk=Object.fromEntries(PD.map(p=>[p.k,p.d]));const yk=p=>pk[p]==='ay'||pk[p]==='firma';const lf=re=>r.tablo.filter(t=>t.leaf&&re(t)&&Math.abs(t.bakiye)>=1);const nm=t=>norm(t.ad);
      const ekle=(kod,kat,ac,on,tut)=>r.bulgular.push({id:'o'+kod+r.bulgular.length,kod,seviye:'sari',kategori:kat,aciklama:ac,oneri:on,tutar:r2(Math.abs(tut||0)),duzeltildi:false,tarih:today(),kaynak:'oto'});
      const sb=a=>a.reduce((q,t)=>q+t.bakiye,0);let a;
      if(yk('pusula')&&(a=lf(t=>/^191/.test(t.kod)&&/iade/.test(nm(t)))).length)ekle('pkpusula','Satış iadesi',`Gider pusulası / iade dökümü "yok" işaretlendi, ama satış iadesi hesaplarında ${tl(sb(a))} KDV var (${a.map(t=>t.kod).join(', ')}).`,'İade dökümünü yükleyip kontrolü yeniden çalıştırın.',sb(a));
      if(yk('z')&&(a=lf(t=>/z rapor/.test(nm(t)))).length)ekle('pkz','Z raporu',`Z raporu "yok" işaretlendi, ama kayıtta Z raporu hesapları var (${a.map(t=>t.kod).join(', ')}).`,'Z raporlarını yükleyip kontrolü yeniden çalıştırın.',sb(a));
      if(yk('pos')&&has(o.krediKarti)&&o.krediKarti>0)ekle('pkpos','Kredi kartı',`POS "yok" işaretlendi, ama beyannamede ${tl(o.krediKarti)} kredi kartı tahsilatı var.`,'GİB POS toplamını yazıp kontrolü yeniden çalıştırın.',o.krediKarti);
      if(yk('satis')&&(a=lf(t=>/^391/.test(t.kod)&&!/z rapor|iade/.test(nm(t)))).length)ekle('pksatis','Satış / e-Arşiv',`GİB satış listesi "yok" işaretlendi, ama hesaplanan KDV hesaplarında ${tl(sb(a))} var.`,'Satış listesini yükleyip kontrolü yeniden çalıştırın.',sb(a));
      if(yk('alis')&&(a=lf(t=>/^191/.test(t.kod)&&!/iade|(^|[^a-z])tevkif(?!atsiz)|sorumlu|kdv 2/.test(nm(t)))).length)ekle('pkalis','Alış / e-Fatura',`GİB alış listesi "yok" işaretlendi, ama indirilecek KDV hesaplarında ${tl(sb(a))} var.`,'Alış listesini yükleyip kontrolü yeniden çalıştırın.',sb(a));
      if(pk.sonraki==='var'&&r.sonrakiAyBelge===0&&(pk.alis==='var'))ekle('pksonraki','Alış / e-Fatura',`Sonraki ay sorgusu onaylandı, ama yüklenen alış listesinde sonraki aya ait hiç belge yok. Liste sonraki ay sorgusundan önce indirilmiş olabilir.`,'GİB\'den Getir ile sonraki ayı sorgulayıp listeyi yeniden indirin ve kontrolü tekrar çalıştırın.',0);
      r.paket=pk;r.notlar.push('Dosya paketi: '+PD.map(p=>`${p.l.split(' (')[0]} ${p.d==='var'?'yüklendi':p.d==='ay'?'bu ay yok':'firmada yok'}`).join('; ')+'.');
      const kr=r.bulgular.filter(b=>b.seviye==='kirmizi').length,sr=r.bulgular.filter(b=>b.seviye==='sari').length;if(r.bulgular.some(b=>/^pk/.test(b.kod))&&!kr)r.sonuc=r.sonuc.replace(/kırmızı bulgu yok\.( \d+ sarı nokta açıklanmalı\.| bulgu yok\.)?|bulgu yok\./,`kırmızı bulgu yok. ${sr} sarı nokta açıklanmalı.`)}
    const yeni=r.bulgular.map(b=>{const e=eski.find(x=>x.kaynak==='oto'&&x.kod===b.kod&&x.aciklama===b.aciklama);return e?{...b,duzeltildi:!!e.duzeltildi,duzTarih:e.duzTarih||''}:b});
    await kSet(mid,{bulgular:[...yeni,...eski.filter(b=>b.kaynak!=='oto')],ozet:o,zDetay:u.z||k.zDetay||null,beyanDetay:bey?{matrah:bey.matrah||{},hkdv:bey.hkdv||{},ikdv:bey.ikdv||{},sorumlu:bey.sorumlu??null}:null,kaynaklar:{...(k.kaynaklar||{}),...r.kaynaklar},tablo:r.tablo,kars:r.kars,tevkifat:r.tevkifat||[],tevOzet:r.tevOzet||null,notlar:r.notlar,sonuc:r.sonuc,paket:r.paket,paketKisi:k.hazirlayan||'',sonrakiSorgu:u.sonraki||'',not:'',kontrolTarihi:today(),durum:'',onayTarihi:''});
    const a=acik(kDoc(mid));u.msg=a.r||a.s?`Kontrol tamamlandı: ${a.r} kırmızı, ${a.s} sarı bulgu.`:'Kontrol tamamlandı, bulgu çıkmadı. Sonuç ve Excel çıktısı aşağıda.'}
  catch(e){u.err=true;u.msg='Kontrol çalıştırılamadı: '+(e&&(e.message||e.code)||'bilinmeyen hata')}
  finally{u.busy=false;render()}}
async function excelIndir(){const mid=S.sec;const k=kDoc(mid);if(!k||!k.tablo){toast('Önce kontrolü çalıştırın');return}
  if(!S.dl){toast('Bu görünümde dosya indirilemiyor');return}
  try{const f=S.firmalar[mid];const buf=await excelOlustur(f.ad,S.donem,k);
    const ad=f.ad.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü ]+/g,'').trim().split(/\s+/).slice(0,2).join('_');
    await S.dl.save({filename:`${ad}_KDV1_Kontrol_${kKey()}.xlsx`,data:buf});toast('Excel indirildi')}
  catch(e){if(e&&e.code==='declined')return;toast('Excel oluşturulamadı: '+(e&&(e.message||e.code)||''))}}
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='dosya'){const fs=[...t.files];t.value='';dosyalarEkle(fs);return}
  if(t.dataset.tur){const x=S.up&&S.up.tablolar.find(x=>x.id===+t.dataset.tur);if(x){x.tur=t.value;render()}return}
  if(t.dataset.oz){const u=upFor(S.sec);const s=t.value.trim();u.ozet[t.dataset.oz]=s?r2(num(s)):NaN;render()}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.calistir){calistir();return}
  if(d.xlk){excelIndir();return}
  if(d.temizle){S.up=null;render();return}
  if(d.pkay){upFor(S.sec).yok[d.pkay]=true;render();return}
  if(d.pksonraki){upFor(S.sec).sonraki=today();render();return}
  if(d.pkfirma){const f=S.firmalar[S.sec]||{};fSet(S.sec,{paketYok:{...(f.paketYok||{}),[d.pkfirma]:true}}).then(render,()=>toast('Kaydedilemedi'));render();return}
  if(d.pkgeri){const u=upFor(S.sec);delete u.yok[d.pkgeri];if(d.pkgeri==='sonraki')u.sonraki='';const f=S.firmalar[S.sec]||{};if(f.paketYok&&f.paketYok[d.pkgeri]){const y={...f.paketYok};delete y[d.pkgeri];fSet(S.sec,{paketYok:y}).then(render,()=>toast('Kaydedilemedi'))}render();return}
  if(d.tsil){const u=S.up;if(u){u.tablolar=u.tablolar.filter(x=>x.id!==+d.tsil);render()}return}});
