// ---------- otomatik kontrol: dosya okuma ve karşılaştırma (saf fonksiyonlar)
const TUR=[['beyan','KDV-1 beyannamesi (PDF)'],['mizan','Mizan'],['muavin','Muavin (191 / 391)'],['defter','İşletme defteri / Defter-Beyan (gelir-gider)'],['gib','KDV ayrım raporu / GİB listesi (alış+satış)'],['gib_alis','GİB alış listesi (e-fatura / e-arşiv)'],['gib_satis','GİB satış listesi'],['esmm','e-SMM listesi'],['pusula','Gider pusulası / satış iadesi dökümü'],['z','Z raporu (fotoğraf)'],['diger','Kullanılmayacak']];
const OZK=['hesaplanan','indirimler','devredenOnceki','odenecek','sonrakiDevreden','krediKarti'];
const has=v=>typeof v==='number'&&isFinite(v);
const num=v=>{if(v==null||v==='')return 0;if(typeof v==='number')return v;let s=String(v).trim().replace(/\s|TL|₺/gi,'');if(!s)return 0;let neg=false;if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1)}if(s.endsWith('-')){neg=true;s=s.slice(0,-1)}
  if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'')}else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,'');
  const n=parseFloat(s);return isNaN(n)?0:(neg?-n:n)};
const hn=c=>norm(c).replace(/\s+/g,' ').trim();
const bno=s=>{let x=String(s??'').toUpperCase().replace(/\s/g,'');if(/^\d+$/.test(x))x=x.replace(/^0+/,'');return x};
const ORAN=x=>{const s=String(x);const m=s.match(/%\s*(\d{1,2})(?!\d)|(\d{1,2})\s*['’]?\s*(?:luk|lik|lık|lük)\b/i);if(m)return String(+(m[1]||m[2]));const b=s.trim().match(/^0?(1|8|10|18|20)\s+\S/);return b?b[1]:null};
function hdrBul(rows){let best=0,bs=-1;for(let i=0;i<Math.min(15,rows.length);i++){const sc=(rows[i]||[]).filter(c=>typeof c==='string'&&/[a-zçğıöşü]/i.test(c)&&c.length<60).length;if(sc>bs){bs=sc;best=i}}return best}
function faturaKolon(h){const m={kR:{},mR:{},tev:[],iptal:[]};
  (h||[]).map(hn).forEach((x,i)=>{if(!x)return;const r=ORAN(x);
    if(/^tevkifat \d+$/.test(x)){m.tev.push(i);return}
    if(/tevkifat orani|tevkifat kodu/.test(x)){m.tevOran=i;return}
    if(/tevkif/.test(x))return;
    if(/matrah/.test(x)){if(/toplam/.test(x))m.mTop=i;else if(r&&!/ozel/.test(x))m.mR[r]=i;return}
    if(/^kdv orani$/.test(x)){m.oranCol=i;return}
    if(/^tutar$/.test(x)&&m.tutar==null){m.tutar=i;return}
    if(/kdv/.test(x)&&!/orani|haric|dahil/.test(x)){if(r)m.kR[r]=i;else if(m.kTop==null)m.kTop=i;return}
    if(m.no==null&&/fatura no|fatura numarasi|belge no|belge numarasi|evrak no/.test(x))m.no=i;
    if(m.ettn==null&&/ettn|uuid/.test(x))m.ettn=i;
    if(m.yon==null&&/(^| )yon/.test(x))m.yon=i;
    if(m.tarih==null&&/tarih/.test(x)&&!/iptal|vade|kayit|onay/.test(x))m.tarih=i;
    if(/iptal|(^| )red( |$)/.test(x))m.iptal.push(i);
    if(m.kanal==null&&/^(tur|fatura turu|belge turu|fatura senaryosu)$/.test(x))m.kanal=i;
    if(m.tip==null&&/^(tip|tipi|fatura tipi)$/.test(x))m.tip=i;
    if(m.gon==null&&/^gonderici( unvan.*)?$|^satici/.test(x))m.gon=i;
    if(/vkn|tckn/.test(x)){if(/gonderici|satici/.test(x))m.gonV=i;else if(/alici/.test(x))m.aliV=i;else if(m.vkn==null)m.vkn=i}
    if(m.ali==null&&/^alici( unvan.*)?$/.test(x))m.ali=i;
    if(m.acik==null&&/aciklama|unvan/.test(x))m.acik=i});
  return m}
function hazirla(t){const n=norm(t.ad+' '+t.sayfa);t.hdr=hdrBul(t.rows);const hs=(t.rows[t.hdr]||[]).map(hn);
  const ilk=norm(t.rows.slice(0,6).map(r=>String(r[0]??'')).join(' '));
  if(/muavin/.test(n+' '+ilk)||(hs.includes('borc')&&hs.some(x=>/evrak no/.test(x))))t.tur='muavin';
  else if(hs.some(x=>/hesap kodu/.test(x))&&hs.includes('borc'))t.tur='mizan';
  else{const f=faturaKolon(t.rows[t.hdr]);
    const vmS=t.rows.slice(0,15).some(r=>r.filter(c=>hn(c)==='vergi matrahi').length>=2);
    if(/pusula/.test(n)||vmS)t.tur='pusula';
    else if(/defter|isletme|gelir|gider|hasilat|dbs/.test(n+' '+ilk)&&(f.kTop!=null||Object.keys(f.kR).length))t.tur='defter';
    else if((f.no!=null||f.ettn!=null)&&(f.kTop!=null||Object.keys(f.kR).length)){
      const kan=f.kanal!=null?t.rows.slice(t.hdr+1,t.hdr+200).map(r=>hn(r[f.kanal])).filter(Boolean):[];
      t.tur=f.yon!=null?'gib':(kan.length&&kan.every(v=>/smm/.test(v))||/smm/.test(n))?'esmm':/giden|satis/.test(n)&&!/alis/.test(n)?'gib_satis':(()=>{const vi=(t.rows[t.hdr]||[]).map(hn).findIndex(x=>/vkn|tckn/.test(x));if(vi<0)return 'gib_alis';const v=t.rows.slice(t.hdr+1,t.hdr+300).map(r=>String(r[vi]??'').replace(/\D/g,'')).filter(Boolean);return v.length&&v.filter(x=>/^1{10,11}$/.test(x)).length/v.length>=0.3?'gib_satis':'gib_alis'})()}
    else t.tur='diger'}
  t.kaynak='otomatik';return t}
function gerekli(t){if(t.tur==='mizan'){const hs=(t.rows[t.hdr]||[]).map(hn);return [!hs.some(x=>/hesap kodu/.test(x))&&'hesap kodu',!hs.includes('borc')&&'borç'].filter(Boolean)}
  if(t.tur==='muavin')return muavinOku(t).length?[]:['evrak no / borç / alacak'];
  if(t.tur==='pusula')return pusulaOku(t).length?[]:['vergi matrahı / KDV sütunları'];
  if(t.tur==='defter'){const d=defterOku(t);return d.length?[]:['KDV / gelir-gider ayrımı']}
  if(/^(gib|gib_alis|gib_satis|esmm)$/.test(t.tur)){const f=faturaKolon(t.rows[t.hdr]);return [f.no==null&&f.ettn==null&&'fatura no',f.kTop==null&&!Object.keys(f.kR).length&&'KDV',t.tur==='gib'&&f.yon==null&&'alış/satış'].filter(Boolean)}
  return []}
const veriSatir=t=>t.rows.slice((t.hdr||0)+1).filter(r=>r&&r.some(c=>c!==''&&c!=null)).filter(r=>!/genel toplam|nakli yekun|bu rapor/.test(norm(r.join(' ')))).filter(r=>!/(^|\s)(genel )?toplam|nakli yekun/.test(norm(r.slice(0,4).join(' '))));
function mizanOku(t){const hs=(t.rows[t.hdr]||[]).map(hn);const ix=f=>hs.findIndex(f);
  const k=ix(x=>/hesap kodu|^kod$/.test(x)),ad=ix(x=>/hesap adi/.test(x)),b=ix(x=>x==='borc'),a=ix(x=>x==='alacak'),bb=ix(x=>/borc bakiye/.test(x)),ab=ix(x=>/alacak bakiye/.test(x));
  if(k<0)return [];
  return veriSatir(t).map(r=>({kod:String(r[k]??'').trim(),ad:String(ad>=0?r[ad]:'').trim(),b:num(r[b]),a:num(r[a]),bb:bb>=0?num(r[bb]):Math.max(0,num(r[b])-num(r[a])),ab:ab>=0?num(r[ab]):Math.max(0,num(r[a])-num(r[b]))})).filter(x=>/^\d/.test(x.kod))}
function muavinOku(t){const out=[];let acc=null,m=null;
  for(const r of t.rows){const c0=String(r[0]??'').trim();const am=c0.match(/^(\d{3}(?:[.\-]\d+)*)\s+\S/);
    if(am&&!r.slice(1,7).some(c=>typeof c==='number')){acc=am[1];continue}
    const hs=r.map(hn);const noI=hs.findIndex(x=>/evrak no|belge no|fatura no/.test(x));
    if(hs.includes('borc')&&(noI>=0||hs.some(x=>/aciklama/.test(x)))){m={no:noI,b:hs.indexOf('borc'),a:hs.indexOf('alacak'),kod:hs.findIndex(x=>/hesap kodu/.test(x)),ac:hs.findIndex(x=>/aciklama/.test(x))};continue}
    if(!m)continue;const kod=m.kod>=0?String(r[m.kod]??'').trim():acc;const acik_=m.ac>=0?String(r[m.ac]??'').trim():'';let ham_=m.no>=0?String(r[m.no]??'').trim():'';if(!ham_){const q=acik_.match(/^\d{1,2}[./]\d{1,2}[./]\d{4}-([^-\s]+)-/);if(q)ham_=q[1]}const no=bno(ham_);const b=num(r[m.b]),a=num(r[m.a]);
    if(kod&&!no&&(b||a)&&/kdv/.test(norm(acik_))&&/tahakkuk|mahsup|virman|kapan|devir/.test(norm(acik_))){out.push({acc:kod,no:'',kapanis:true,b,a,acik:acik_});continue}
    if(!kod||!no||(!b&&!a)||/nakli yekun|^\s*(ara |genel )?toplam(\s|:|$)/.test(norm(r.slice(0,4).join(' '))))continue;
    out.push({acc:kod,no,ham:ham_,b,a,acik:acik_})}
  return out}
function pusulaOku(t){const R_=t.rows;const h=R_.findIndex(r=>r.some(c=>hn(c)==='vergi matrahi'));if(h<0)return [];
  const bl=[];R_[h].forEach((c,i)=>{if(hn(c)!=='vergi matrahi')return;const ust=[h-1,h-2].map(j=>j>=0?R_[j]:[]);let o=null;for(const u of ust){for(let q=i;q>=Math.max(0,i-2)&&o==null;q--){const v=u[q];if(v!==''&&v!=null){const nv=num(v);o=(nv>0&&nv<=30&&!/toplam/.test(hn(v)))?String(nv):'T'}}if(o)break}
    const ki=R_[h].findIndex((c,j)=>j>i&&hn(c)==='kdv');if(o&&o!=='T'&&ki>i)bl.push({o,mi:i,ki})});
  const out=[];for(const r of R_.slice(h+1)){if(!r||/toplam/.test(norm(r.join(' '))))continue;const k={},m={};for(const b of bl){const kv=Math.abs(num(r[b.ki])),mv=Math.abs(num(r[b.mi]));if(kv)k[b.o]=r2(kv);if(mv)m[b.o]=r2(mv)}
    const kdv=r2(Object.values(k).reduce((a,v)=>a+v,0));if(!kdv)continue;const cs=r.map(c=>String(c??'').trim());
    const orig=cs.find(c=>/^[A-Z0-9]{3}20\d{11}$/.test(c))||'';const seri=cs.slice(1,5).find(c=>/^[A-Za-z][A-Za-z0-9]{0,2}$/.test(c))||'';
    const pno=cs.slice(2,9).find(c=>/^\d{1,9}$/.test(c))||'';const ad=cs.slice(0,4).find(c=>c.length>3&&/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(c)&&!/^[A-Z0-9]{3}20\d{11}$/.test(c))||'';
    out.push({tarih:tarihOku(r[0]),ad,seri,pno,orig,k,m,kdv})}
  return out}
function defterOku(t){const f=faturaKolon(t.rows[t.hdr]);const hs=(t.rows[t.hdr]||[]).map(hn);
  const oranI=hs.findIndex(x=>/kdv orani|^oran$|^oran %|kdv %$/.test(x));
  let mI=f.mTop;if(mI==null){const i=hs.findIndex(x=>/matrah|kdv haric|^tutar$|^tutari$|^net tutar|gider tutar|gelir tutar/.test(x)&&!/toplam|tevkif|ozel|stopaj/.test(x));if(i>=0)mI=i}
  const seriI=hs.findIndex(x=>/belge seri/.test(x)),siraI=hs.findIndex(x=>/belge sira|^sira no$/.test(x));
  const turI=hs.findIndex(x=>/kayit turu|gelir.?gider|^islem turu$|^turu$|^tur$|^kayit tipi$/.test(x));
  const n=norm(t.ad+' '+t.sayfa);const vy=/gider|alis|gelen/.test(n)?'alis':/gelir|hasilat|satis|giden/.test(n)?'satis':null;const out=[];
  for(const r of veriSatir(t)){let yon=vy;if(turI>=0){const v=hn(r[turI]);yon=/gider|alis|gelen|maliyet|amortisman/.test(v)?'alis':/gelir|hasilat|satis|giden/.test(v)?'satis':yon}if(!yon)continue;
    const k={},mm={};for(const [o,i] of Object.entries(f.kR)){const v=num(r[i]);if(v)k[o]=v}for(const [o,i] of Object.entries(f.mR)){const v=num(r[i]);if(v)mm[o]=v}
    if(!Object.keys(k).length&&f.kTop!=null){const kd=num(r[f.kTop]);let o=oranI>=0?num(r[oranI]):0;if(o>0&&o<1)o=o*100;o=o?String(Math.round(o)):'?';if(kd)k[o]=kd;if(mI!=null&&num(r[mI]))mm[o]=num(r[mI])}
    else if(!Object.keys(mm).length&&mI!=null&&Object.keys(k).length===1)mm[Object.keys(k)[0]]=num(r[mI]);
    const kdv=Object.values(k).reduce((s,v)=>s+v,0);if(!kdv&&!Object.keys(mm).length)continue;
    out.push({yon,no:bno(siraI>=0?String(seriI>=0?r[seriI]??'':'')+String(r[siraI]??''):f.no!=null?r[f.no]:f.ettn!=null?r[f.ettn]:''),k,m:mm,kdv:r2(kdv),tev:r2(f.tev.reduce((s,i)=>s+num(r[i]),0))})}
  return out}
function kanalBul(v,tur){const x=hn(v);if(/arsiv/.test(x))return 'e-arşiv';if(/smm/.test(x))return 'e-smm';if(/fatura/.test(x))return 'e-fatura';if(/satis|iade|tevkifat|istisna|ozel/.test(x))return 'e-fatura*';return tur==='esmm'?'e-smm':'e-fatura'}
function tarihOku(v){if(v==null||v==='')return '';if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,7)}const s=String(v).trim();let m=s.match(/^(\d{4})[-./](\d{1,2})/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}`;m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}`;return ''}
function faturaOku(t){const f=faturaKolon(t.rows[t.hdr]);const out=[];
  for(const r of veriSatir(t)){const no=bno(f.no!=null?r[f.no]:r[f.ettn]);if(!no)continue;
    let yon=t.tur==='gib_satis'?'satis':'alis';if(f.yon!=null){const y=hn(r[f.yon]);yon=/satis|giden/.test(y)?'satis':/alis|gelen/.test(y)?'alis':null}if(!yon)continue;
    const k={},mm={};if(f.oranCol!=null){const ro=String(Math.round(num(r[f.oranCol])));const kv=f.kTop!=null?num(r[f.kTop]):0,mv=f.tutar!=null?num(r[f.tutar]):0;if(kv)k[ro]=kv;if(mv)mm[ro]=mv}for(const [o,i] of Object.entries(f.kR)){const v=num(r[i]);if(v)k[o]=v}for(const [o,i] of Object.entries(f.mR)){const v=num(r[i]);if(v)mm[o]=v}
    let kdv=f.kTop!=null?num(r[f.kTop]):Object.values(k).reduce((s,v)=>s+v,0);let tev=r2(f.tev.reduce((s,i)=>s+num(r[i]),0));
    const to=f.tevOran!=null?String(r[f.tevOran]??'').match(/(\d+)\s*\/\s*(\d+)/):null;let tevOran=to?`${+to[1]}/${+to[2]}`:'';
    if(to&&!tev&&Object.keys(mm).length){const top=r2(Object.entries(mm).reduce((s,[o,v])=>s+v*(+o)/100,0));if(top>kdv+0.01){tev=r2(top-kdv);for(const [o,v] of Object.entries(mm))k[o]=r2(v*(+o)/100);kdv=top}}
    const tipV=hn(f.tip!=null?r[f.tip]:'')+' '+hn(f.kanal!=null?r[f.kanal]:'');const iade=/iade/.test(tipV),istisna=/istisna/.test(tipV),tevTip=/tevkifat/.test(tipV)&&!/tevkifatsiz/.test(tipV);
    if(istisna&&Math.abs(kdv)<0.01){const t0=Object.values(mm).reduce((a,v)=>a+v,0);for(const o of Object.keys(mm))delete mm[o];if(t0)mm['0']=r2(t0)}
    if(!tevOran&&tev&&kdv)tevOran=`${Math.round(tev/kdv*10)}/10`;
    const ipt=f.iptal.some(i=>{const v=hn(r[i]);return v&&!/^(hayir|yok|0|false|-|onaylandi|basarili|gecerli)$/.test(v)});
    out.push({yon,kanal:(()=>{const k_=kanalBul(f.kanal!=null?r[f.kanal]:'',t.tur);return k_==='e-fatura*'?'e-fatura':k_})(),kanalKesin:kanalBul(f.kanal!=null?r[f.kanal]:'',t.tur)!=='e-fatura*'&&f.kanal!=null,no,k,m:mm,iade,istisna,tevTip,vkn:String((yon==='alis'?(f.gonV??f.vkn):(f.aliV??f.vkn))!=null?r[yon==='alis'?(f.gonV??f.vkn):(f.aliV??f.vkn)]:'')
      .replace(/\D/g,'').replace(/^0+/,''),kdv:r2(kdv),tev,tevOran,tarih:tarihOku((()=>{const v=f.tarih!=null?r[f.tarih]:'';const s_=String(v);if(/T\d\d:\d\d.*Z$/.test(s_)){const d=new Date(new Date(s_).getTime()+3*3600e3);return d.toISOString().slice(0,10)}return v})()),iptal:ipt,karsi:String(yon==='alis'?(f.gon!=null?r[f.gon]:f.acik!=null?r[f.acik]:''):(f.ali!=null?r[f.ali]:f.acik!=null?r[f.acik]:'')).trim(),dosya:t.ad})}
  if(f.oranCol!=null){const g=new Map();for(const x of out){const key=x.yon+'|'+x.no+'|'+x.vkn;const e=g.get(key);if(!e){g.set(key,x);continue}for(const [o,v] of Object.entries(x.k))e.k[o]=r2((e.k[o]||0)+v);for(const [o,v] of Object.entries(x.m))e.m[o]=r2((e.m[o]||0)+v);e.kdv=r2(e.kdv+x.kdv);e.iade=e.iade||x.iade;e.istisna=e.istisna&&x.istisna;e.tevTip=e.tevTip||x.tevTip}return [...g.values()]}
  return out}
function beyanOku(text){const L=String(text||'').split('\n').map(s=>s.replace(/\s+/g,' ').trim());const P=/(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const son=re=>{for(const l of L)if(re.test(norm(l))){const m=l.match(P);if(m)return num(m[m.length-1])}return null};
  const o={hesaplanan:son(/^hesaplanan katma deger vergisi/),indirimler:son(/^indirimler toplami/),devredenOnceki:son(/^onceki donemden devreden/),odenecek:son(/^bu donemde odenmesi gereken/)??son(/^odenmesi gereken katma/),sonrakiDevreden:son(/^sonraki doneme devreden/),krediKarti:son(/kredi karti ile tahsil/),sorumlu:son(/^sorumlu sifatiyla beyan/),matrahToplam:son(/^matrah toplami/),satisIade:son(/^satistan iade edilen/),istisna:son(/^istisna kapsamina giren islemlere ait toplam/)};
  {const i=L.findIndex(l=>/^alinan mallarin iadesi/.test(norm(l)));if(i>=0){const m=(L[i]+' '+(L[i+1]||'')).match(P);if(m&&m.length>=2){o.iadeM=num(m[0]);o.iadeK=num(m[1])}}}
  o.matrah={};o.hkdv={};o.ikdv={};let bolum='';
  for(const l of L){const n=norm(l);if(/matrah ve vergi bildirimi/.test(n))bolum='m';else if(/^matrah toplami/.test(n))bolum='';
    if(/oranlara gore dagilimi/.test(n))bolum='i';else if(/ihrac kaydiyla teslim bedeli/.test(n))bolum='';
    const s=l.match(/^(?:.*?\s)?(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/);
    if(bolum==='m'&&s){o.matrah[s[2]]=r2((o.matrah[s[2]]||0)+num(s[1]));o.hkdv[s[2]]=r2((o.hkdv[s[2]]||0)+num(s[3]))}
    const t=l.match(/kdv\s+(\d{1,2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/i);
    if(bolum==='i'&&t)o.ikdv[t[1]]=r2((o.ikdv[t[1]]||0)+num(t[3]))}
  const ay=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];const yl=(L.find(l=>/\byil\b/i.test(norm(l)))||'').match(/(20\d\d)/);
  const al=L.map(norm).find(l=>/(^| )ay (ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)/.test(l));
  if(yl&&al){const i=ay.findIndex(a=>al.includes(' '+a)||al.endsWith(a));if(i>=0)o.donem=`${yl[1]}/${String(i+1).padStart(2,'0')}`}
  return o}
// --- analiz
function hesapla(tabs,o,onceki,pdfBeyan,zData,donem){const B=[],NOT=[];const bul=(kod,seviye,kategori,aciklama,oneri,tutar)=>B.push({id:'o'+kod+B.length,kod,seviye,kategori,aciklama,oneri,tutar:r2(Math.abs(tutar||0)),duzeltildi:false,tarih:today(),kaynak:'oto'});
  const miz=[].concat(...tabs.filter(t=>t.tur==='mizan').map(mizanOku));const muAll=[].concat(...tabs.filter(t=>t.tur==='muavin').map(muavinOku));const mu=muAll.filter(x=>!x.kapanis);
  {const kap=muAll.filter(x=>x.kapanis&&/^(191|391)/.test(x.acc));if(kap.length){const ads=new Set();for(const m of miz){if(!/^(191|391)/.test(m.kod))continue;const ks=kap.filter(x=>x.acc===m.kod||x.acc.startsWith(m.kod+'.'));if(!ks.length)continue;const kb=ks.reduce((q,x)=>q+x.b,0),ka=ks.reduce((q,x)=>q+x.a,0);
      if(/^1/.test(m.kod)){const nb=r2(m.bb-m.ab+ka-kb);m.bb=Math.max(nb,0);m.ab=Math.max(-nb,0)}else{const nb=r2(m.ab-m.bb+kb-ka);m.ab=Math.max(nb,0);m.bb=Math.max(-nb,0)}m.b=r2(m.b-kb);m.a=r2(m.a-ka);ks.forEach(x=>ads.add(x.acik))}
    NOT.push(`Dönem sonu KDV kapanış/tahakkuk kaydı (${[...ads].slice(0,2).join('; ')}) 191 ve 391 hesaplarını kapatmış; kontrol bu kayıt öncesindeki bakiyelerle yapıldı.`)}
   else if(miz.some(m=>/^191$|^391$/.test(m.kod)&&m.b>0&&Math.abs(m.b-m.a)<0.01))NOT.push('Mizanda 191/391 hesapları dönem sonunda kapatılmış görünüyor (borç = alacak). Muavin de yüklenirse kapanış kaydı ayıklanıp kontrol kapanış öncesi bakiyelerle yapılır.')}
  let invAll=[].concat(...tabs.filter(t=>/^(gib|gib_alis|gib_satis|esmm)$/.test(t.tur)).map(faturaOku));
  const dk=donem?String(donem).replace('/','-'):(pdfBeyan&&pdfBeyan.donem?String(pdfBeyan.donem).replace('/','-'):'');
  let sonrakiAyBelge=null;if(dk){const [yy,mm_]=dk.split('-').map(Number);const nx=mm_===12?`${yy+1}-01`:`${yy}-${String(mm_+1).padStart(2,'0')}`;sonrakiAyBelge=invAll.filter(x=>x.tarih===nx&&x.yon==='alis').length;}
  if(dk){const dis=invAll.filter(x=>x.tarih&&x.tarih!==dk);if(dis.length){invAll=invAll.filter(x=>!x.tarih||x.tarih===dk);const by={};for(const x of dis)by[x.tarih]=(by[x.tarih]||[]).concat(x);
    NOT.push(`Dönem dışı ${dis.length} GİB belgesi kontrole alınmadı: ${Object.entries(by).map(([a,xs])=>`${a} (${xs.length} belge, KDV ${tl(xs.reduce((s,x)=>s+x.kdv,0))}${xs.length<=4?': '+xs.map(x=>`${x.no} ${tl(x.kdv)}`).join(', '):''})`).join('; ')}. Bunlar ait oldukları ayın kontrolünde değerlendirilecek.`)}}
  let inv=[],al=[],sa=[],alIade=[],saIade=[],ipt=new Set();const yonsuz=new Set(tabs.filter(t=>/^(gib_alis|gib_satis)$/.test(t.tur)).map(t=>t.ad));
  const ayir=()=>{const gor=new Map(),vk=new Set();inv=[];const srt=[...invAll].sort((a,b)=>(b.vkn?1:0)-(a.vkn?1:0));for(const x of srt){const k=x.yon+'|'+x.no+'|'+(x.vkn||'');if(gor.has(k)||(!x.vkn&&vk.has(x.yon+'|'+x.no))){const e=gor.get(k)||inv.find(y=>y.yon===x.yon&&y.no===x.no);if(e&&!e.kanalKesin&&x.kanalKesin){e.kanal=x.kanal;e.kanalKesin=true}continue}gor.set(k,x);vk.add(x.yon+'|'+x.no);inv.push(x)}
    al=inv.filter(x=>x.yon==='alis'&&!x.iptal&&!x.iade);sa=inv.filter(x=>x.yon==='satis'&&!x.iptal&&!x.iade);alIade=inv.filter(x=>x.yon==='alis'&&!x.iptal&&x.iade);saIade=inv.filter(x=>x.yon==='satis'&&!x.iptal&&x.iade);ipt=new Set(inv.filter(x=>x.iptal).map(x=>x.no))};ayir();
  const pus=[].concat(...tabs.filter(t=>t.tur==='pusula').map(pusulaOku));
  const def=[].concat(...tabs.filter(t=>t.tur==='defter').map(defterOku));const defterMod=!miz.length&&def.length>0;
  if(defterMod){const agg=(arr,key)=>{const o={};for(const x of arr)for(const [r,v] of Object.entries(x[key]))o[r]=r2((o[r]||0)+v);return o};const sm=o=>r2(Object.values(o).reduce((s,v)=>s+v,0));const so=o=>Object.keys(o).sort((a,b)=>a-b);
    const dS=def.filter(x=>x.yon==='satis'),dA=def.filter(x=>x.yon==='alis'),kA_=agg(dA,'k'),kS_=agg(dS,'k'),mS_=agg(dS,'m'),tv=r2(dA.reduce((s,x)=>s+x.tev,0));
    const P=(kod,ad,bb,ab)=>miz.push({kod,ad,b:bb,a:ab,bb,ab});
    if(dA.length){P('191','İNDİRİLECEK KDV (defter gider kayıtları)',r2(sm(kA_)+tv),0);for(const r of so(kA_))P('191.'+r,`İndirilecek KDV %${r}`,kA_[r],0);if(tv)P('191.T','Sorumlu sıfatıyla ödenen KDV (tevkifat)',tv,0);
}else NOT.push('Defter gider kayıtları yüklenmedi; indirilecek KDV defterle karşılaştırılamadı.');
    if(dS.length){P('391','HESAPLANAN KDV (defter gelir kayıtları)',0,sm(kS_));for(const r of so(kS_))P('391.'+r,`Hesaplanan KDV %${r}`,0,kS_[r]);
    P('600','HASILAT (defter gelir kayıtları)',0,sm(mS_));for(const r of so(mS_))P('600.'+r,`Hasılat %${r}`,0,mS_[r])}else NOT.push('Defter gelir kayıtları yüklenmedi; hesaplanan KDV ve hasılat defterle karşılaştırılamadı.')}
  const has_={miz:miz.length>0,mu:mu.length>0,gA:inv.some(x=>x.yon==='alis'),gS:inv.some(x=>x.yon==='satis')};
  const pdf=!!pdfBeyan;const bey=pdfBeyan||{};
  if(!has(o.hesaplanan))bul('beyan','sari','Diğer','Beyanname tutarları yok; beyan karşılaştırması yapılamadı.','Beyanname PDF\'ini yükleyin veya tutarları elle yazın.',0);
  if(!has_.miz)bul('mizan','sari','Diğer','Mizan veya işletme defteri kayıtları yüklenmedi; kayıt bazında kontrol yapılamadı.','Bilanço firmasında mizanı, şahıs firmasında Defter-Beyan gelir ve gider kayıtlarını Excel olarak yükleyin.',0);
  // muavin kayıt haritaları
  const kA=new Map(),kS=new Map(),mukk=new Map();
  if(!mu.length&&def.length)for(const x of def){if(!x.no)continue;if(x.yon==='alis')kA.set(x.no,r2((kA.get(x.no)||0)+x.kdv+x.tev));else kS.set(x.no,r2((kS.get(x.no)||0)+x.kdv))}
  const iadeAcc=new Set(miz.filter(m=>/iade/.test(norm(m.ad))).map(m=>m.kod));
  for(const x of mu){if(/^191/.test(x.acc)&&!iadeAcc.has(x.acc))kA.set(x.no,r2((kA.get(x.no)||0)+x.b-x.a));if(/^391/.test(x.acc))kS.set(x.no,r2((kS.get(x.no)||0)+x.a-x.b));const key=x.acc+'|'+x.no+'|'+x.b+'|'+x.a;mukk.set(key,(mukk.get(key)||0)+1)}
  // alış/satış ayrımı belirsiz listelerde yönü kayıtla eşleşmeye göre düzelt
  for(const ad of yonsuz){const xs=invAll.filter(x=>x.dosya===ad);if(!xs.length)continue;const s=xs.filter(x=>kS.has(x.no)).length,a=xs.filter(x=>kA.has(x.no)).length;const yeni=s>a?'satis':a>s?'alis':null;
    if(yeni&&xs[0].yon!==yeni){xs.forEach(x=>x.yon=yeni);NOT.push(`${ad} listesi, belgeleri ${yeni==='satis'?'satış':'alış'} kayıtlarında bulunduğu için ${yeni==='satis'?'satış':'alış'} listesi olarak değerlendirildi.`)}}
  ayir();has_.gA=inv.some(x=>x.yon==='alis');has_.gS=inv.some(x=>x.yon==='satis');
  // kontrol tablosu
  const sec=miz.filter(m=>/^(191|391|600|601|602)/.test(m.kod)||(/^360/.test(m.kod)&&/kdv/.test(norm(m.ad))&&!miz.some(o=>o!==m&&o.kod.startsWith(m.kod+'.'))));
  const leaf=m=>!miz.some(o=>o!==m&&(o.kod.startsWith(m.kod+'.')||(o.kod.length>m.kod.length&&o.kod.startsWith(m.kod)&&!/[.\-]/.test(o.kod))));
  const pay=(x,r)=>{const v=x.k[r]||0;return x.tev&&x.kdv?v-x.tev*(v/x.kdv):v};
  const KOL=['e-fatura','e-smm','fis','e-arsiv','tevkifat','gider'];
  // tevkifat analizi: muavinde aynı belgenin tevkifatsız (191.108) ve sorumlu (191.109) kısımlarını topla
  const accAd=a=>{const m=miz.find(x=>x.kod===a);return norm(m?m.ad:'')};const sorumluHesap=a=>/(^|[^a-z])tevkif(?!atsiz)|sorumlu|kdv 2/.test(accAd(a));
  {const sor=new Map();for(const x of mu.filter(x=>/^191/.test(x.acc)&&sorumluHesap(x.acc)))sor.set(x.no,r2((sor.get(x.no)||0)+x.b-x.a));const tv_=[];
    for(const x of al)if(x.tevTip&&!x.tev&&sor.get(x.no)>0&&sor.get(x.no)<x.kdv){x.tev=sor.get(x.no);x.tevOran=`${Math.round(x.tev/x.kdv*10)}/10`;tv_.push(`${x.no} ${x.tevOran} (${tl(x.tev)})`)}
    if(tv_.length)NOT.push(`Fatura listesinde tevkifat tutarı yazmayan ${tv_.length} tevkifatlı faturanın tevkif tutarı muavindeki sorumlu KDV kaydından alındı: ${tv_.join(', ')}. Oranı faturadan teyit edin.`)}
  const tvk=new Map();for(const x of mu.filter(x=>/^191/.test(x.acc))){const e=tvk.get(x.no)||{no:x.no,karsi:x.acik||'',satici:0,tev:0};if(sorumluHesap(x.acc))e.tev=r2(e.tev+x.b-x.a);else e.satici=r2(e.satici+x.b-x.a);if(!e.karsi&&x.acik)e.karsi=x.acik;tvk.set(x.no,e)}
  for(const x of def.filter(x=>x.yon==='alis'&&x.tev)){tvk.set(x.no,{no:x.no,karsi:'',satici:x.kdv,tev:x.tev})}
  for(const x of al.filter(x=>x.tev))if(!tvk.has(x.no))tvk.set(x.no,{no:x.no,karsi:x.karsi,satici:0,tev:0,kayitYok:true});
  const tevSat=[...tvk.values()].filter(e=>e.tev||e.kayitYok).map(e=>{const g=al.find(x=>x.no===e.no);const top=r2(e.satici+e.tev);const o10=top?e.tev/top*10:0;const yd=!g&&!e.satici&&e.tev>0;
    const s={no:e.no,karsi:e.karsi||(g&&g.karsi)||'',satici:e.satici,tev:e.tev,toplam:top,oran:top?`${Math.round(o10)}/10`:'',tur:yd?'Yurt dışı hizmet (tamamı sorumlu)':'Yurtiçi kısmi tevkifat',gibKdv:g?g.kdv:null,gibTev:g?g.tev:null,gibOran:g?g.tevOran:'',durum:''};
    const d=[];if(e.kayitYok)d.push('kayıtta yok');if(top&&Math.abs(o10-Math.round(o10))>0.05)d.push('standart dışı oran');if(g){if(Math.abs(g.kdv-top)>=1)d.push(`toplam KDV GİB'de ${tl(g.kdv)}`);if(Math.abs(g.tev-e.tev)>=1)d.push(`tevkifat GİB'de ${tl(g.tev)}`);if(g.tevOran&&s.oran&&g.tevOran!==s.oran)d.push(`oran GİB'de ${g.tevOran}`)}
    s.durum=d.length?d.join('; '):g?'GİB ile tutarlı':yd?'GİB listesinde yok (yurt dışı)':'GİB listesinde yok';return s});
  const tevGib=r2(tevSat.filter(s=>s.gibTev!=null).reduce((a,s)=>a+s.gibTev,0)),tevYd=r2(tevSat.filter(s=>s.tur.startsWith('Yurt dışı')).reduce((a,s)=>a+s.tev,0));
  for(const s of tevSat.filter(s=>/kayıtta yok|toplam KDV|tevkifat GİB|oran GİB/.test(s.durum)))bul('tev'+s.no,'kirmizi','Tevkifat / KDV-2',`${s.no} (${s.karsi||'—'}): ${s.durum}. Kayıtta toplam KDV ${tl(s.toplam)}, tevkif ${tl(s.tev)} (${s.oran}).`,'Faturadaki tevkifat oranına göre 191.108 / 191.109 ve KDV-2 kaydını düzeltin.',s.tev);
  for(const s of tevSat.filter(s=>/standart dışı/.test(s.durum)))bul('tevo'+s.no,'sari','Tevkifat / KDV-2',`${s.no} (${s.karsi||'—'}): tevkifat oranı ${(s.tev/s.toplam*10).toFixed(2).replace('.',',')}/10, standart bir oran değil.`,'Tevkif edilen tutarı faturadaki oranla yeniden hesaplayın.',s.tev);
  // Z raporu: oranlara göre KDV ve matrah
  const zK={},zM={};const zT=has(o.zTop)?o.zTop:0,zV=has(o.zKdv)?o.zKdv:0;
  if(zData&&zData.oranlar&&zData.oranlar.length){for(const x of zData.oranlar){const r=String(Math.round(num(x.oran)));if(num(x.kdv))zK[r]=r2((zK[r]||0)+num(x.kdv));if(num(x.matrah))zM[r]=r2((zM[r]||0)+num(x.matrah))}}
  else if(zT&&zV){const mt=r2(zT-zV);const oran=mt?zV/mt*100:0;const r=['1','10','20','8','18'].find(x=>Math.abs(oran-+x)<0.6)||'?';zK[r]=zV;zM[r]=mt}
  const zVar=Object.keys(zK).length>0;const zHesap=sec.some(m=>/^391/.test(m.kod)&&/z rapor/.test(norm(m.ad))),zSat=sec.some(m=>/^60/.test(m.kod)&&/z rapor/.test(norm(m.ad)));
  const zTop_=o=>r2(Object.values(o).reduce((s,v)=>s+v,0));
  const tablo=sec.map(m=>{const n=norm(m.ad),lf=leaf(m),r=ORAN(m.ad),src={};const bakiye=r2(/^1/.test(m.kod)?m.bb-m.ab:m.ab-m.bb);
    if(lf){const add=(k,v)=>{if(v)src[k]=r2((src[k]||0)+v)};const kn=x=>x.kanal==='e-arşiv'?'e-arsiv':x.kanal;
      if(/^191/.test(m.kod)){if(/(^|[^a-z])tevkif(?!atsiz)|sorumlu|kdv 2/.test(n))add('tevkifat',tevGib+tevYd);else{for(const x of (/iade/.test(n)?alIade:al))add(kn(x),r?pay(x,r):x.kdv-x.tev);if(/iade/.test(n))for(const x of pus)add('gider',r?(x.k[r]||0):x.kdv)}}
      else if(/^391/.test(m.kod)){if(/z rapor/.test(n))add('fis',r?(zK[r]||0):zTop_(zK));else if(/iade/.test(n)){for(const x of saIade)add(kn(x),r?(x.k[r]||0):x.kdv)}else{for(const x of sa)add(kn(x),r?(x.k[r]||0):x.kdv);if(!zHesap)add('fis',r?(zK[r]||0):zTop_(zK))}}
      else if(/^60[0]/.test(m.kod)&&(r||/z rapor/.test(n)||!sec.some(q=>/^600/.test(q.kod)&&ORAN(q.ad)))){if(/z rapor/.test(n))add('fis',r?(zM[r]||0):zTop_(zM));else{for(const x of sa)add(kn(x),r?(x.m[r]||0):Object.values(x.m).reduce((s,v)=>s+v,0));if(!zSat)add('fis',r?(zM[r]||0):zTop_(zM))}}
      else if(/^60[12]/.test(m.kod)&&(r==='0'||/istisna/.test(n))){for(const x of sa)add(kn(x),x.m['0']||0)}
      else if(/^360/.test(m.kod))add('tevkifat',tevGib+tevYd)}
    const toplam=r2(KOL.reduce((s,k)=>s+(src[k]||0),0));return{kod:m.kod,ad:m.ad,b:m.b,a:m.a,bb:m.bb,ab:m.ab,leaf:lf,src,toplam:lf?toplam:null,fark:lf?r2(toplam-bakiye):null,bakiye}});
  const kars=[];
  const ydNo=new Set(tevSat.filter(s=>s.tur.startsWith('Yurt dışı')).map(s=>s.no));const alNo=new Set(al.map(x=>x.no));const kAy=[...kA.keys()].filter(n=>!ydNo.has(n));
  const alKap=kAy.length?kAy.filter(n=>alNo.has(n)).length/kAy.length:1;const alEksik=kAy.length>=5&&alKap<0.5;
  const aciklanan=new Set();const disKayit=acc=>mu.filter(x=>x.acc===acc&&!alNo.has(x.no)&&!ydNo.has(x.no)&&!aciklanan.has(x.no));
  let sonD=[];const fisRe=/noter|yevmiye|gumruk|tapu|harc|(^|\s)nl\s.*\smk(\s|$)/;
  for(const t of tablo){if(!t.leaf||!/^191/.test(t.kod)||/iade|(^|[^a-z])tevkif(?!atsiz)|sorumlu|kdv 2/.test(norm(t.ad))||!KOL.some(k=>t.src[k]))continue;
    const kn_=disKayit(t.kod).filter(x=>fisRe.test(norm((x.acik||'')+' '+(x.ham||''))));if(!kn_.length)continue;const ks=r2(kn_.reduce((a,x)=>a+x.b-x.a,0));
    t.src.fis=r2((t.src.fis||0)+ks);t.toplam=r2(t.toplam+ks);t.fark=r2(t.toplam-t.bakiye);kn_.forEach(x=>aciklanan.add(x.no));
    NOT.push(`${t.kod}: GİB listesinde olmayan ${kn_.length} noter/gümrük belgesi (KDV ${tl(ks)}) fiş sütununa alındı: ${kn_.slice(0,8).map(x=>`${x.ham||x.no} ${tl(x.b-x.a)}`).join('; ')}${kn_.length>8?' …':''}.`)}
  const kSy=[...kS.keys()].filter(n=>!/^\d{1,5}$/.test(n));const saNo=new Set([...sa,...saIade].map(x=>x.no));const satKap=kSy.length?kSy.filter(n=>saNo.has(n)).length/kSy.length:1;const satEksik=kSy.length>=5&&satKap<0.5;
  if(satEksik)NOT.push(`GİB satış listesi eksik görünüyor: kayıttaki ${kSy.length} satış belgesinin yalnızca ${Math.round(satKap*100)}%'i listede var. e-Arşiv ve e-Fatura giden fatura listelerinin tamamını yükleyin; satış tarafındaki farklar bu yüzden kesin değil.`);
  if(alEksik)NOT.push(`GİB alış listesi eksik görünüyor: kayıttaki ${kA.size} alış belgesinin yalnızca ${Math.round(alKap*100)}%'i listede var. e-Fatura ve e-Arşiv gelen fatura listelerinin tamamını yükleyin; alış tarafındaki farklar bu yüzden kesin değil.`);
  const ors600=tablo.filter(t=>t.leaf&&/^600/.test(t.kod)&&!ORAN(t.ad)&&!KOL.some(k=>t.src[k])&&t.bakiye),ors600S=r2(ors600.reduce((q,t)=>q+t.bakiye,0));
  const ors600F=r2(tablo.filter(t=>t.leaf&&/^600/.test(t.kod)&&ORAN(t.ad)&&KOL.some(k=>t.src[k])).reduce((q,t)=>q+t.fark,0));const ors600Ok=ors600.length&&Math.abs(ors600F-ors600S)<1;
  for(const t of tablo){if(!t.leaf)continue;const kaynakli=KOL.some(k=>t.src[k]);
    if(ors600Ok&&/^600/.test(t.kod)&&Math.abs(t.fark)>=5&&KOL.some(k=>t.src[k])){NOT.push(`${t.kod} ${t.ad}: GİB satış matrahı kayıttan ${tl(t.fark)} fazla; bu tutar oran yazmayan ${ors600.map(x=>`${x.kod} ${x.ad} (${tl(x.bakiye)})`).join(', ')} hesabına kaydedilen satışlarla birebir aynı. Fark yok, satışlar iki hesaba bölünmüş.`);continue}
    if(kaynakli&&Math.abs(t.fark)>=5&&/^(391|60)/.test(t.kod)&&satEksik){NOT.push(`${t.kod}: kayıt ${tl(t.bakiye)}, listedeki satış ${tl(t.toplam)} (satış listesi eksik olduğu için karşılaştırma kesin değil).`);continue}
    if(kaynakli&&Math.abs(t.fark)>=5&&/^191/.test(t.kod)&&alEksik)NOT.push(`${t.kod}: kayıt ${tl(t.bakiye)}, listedeki alış KDV'si ${tl(t.toplam)} (alış listesi eksik olduğu için karşılaştırma kesin değil).`);
    else if(kaynakli&&Math.abs(t.fark)>=5&&/^191/.test(t.kod)&&t.fark>0&&!/(^|[^a-z])tevkif(?!atsiz)|sorumlu/.test(norm(t.ad)))bul('t'+t.kod,'sari','Alış / e-Fatura',`${t.kod} ${t.ad}: GİB'deki alış KDV'si ${tl(t.toplam)}, kayıtta ${tl(t.bakiye)}. ${tl(t.fark)} TL KDV henüz indirilmemiş.`,'İndirilmeyen belgeleri kontrol edin; KDV, belgenin ait olduğu takvim yılı içinde indirilebilir.',t.fark);
    else if(kaynakli&&t.fark<=-5&&/^191/.test(t.kod)&&(()=>{const d=disKayit(t.kod);const s=r2(d.reduce((a,x)=>a+x.b-x.a,0));const ok=d.length&&Math.abs(s+t.fark)<1;if(ok){d.forEach(x=>aciklanan.add(x.no));sonD=d}return ok})())bul('t'+t.kod,'sari','Alış / e-Fatura',`${t.kod} ${t.ad}: kayıtta ${tl(-t.fark)} TL fazla; fark GİB listesinde olmayan belgelerden geliyor: ${sonD.map(x=>`${x.ham||x.no} ${x.acik?'('+x.acik.slice(0,40)+') ':''}${tl(x.b-x.a)}`).join('; ')}.`,/smm|serbest meslek/.test(norm(sonD.map(x=>x.acik).join(' ')))?'Serbest meslek makbuzları GİB fatura listesinde yer almaz: e-SMM listesini (GİB portalı, e-SMM sorgulama) de yükleyin; makbuzlar listede çıkarsa bu nokta kendiliğinden kapanır.':'Gümrük beyannamesi veya kâğıt belge ise belgenin aslını kontrol edin; değilse kaydı düzeltin.',t.fark);
    else if(kaynakli&&Math.abs(t.fark)>=5)bul('t'+t.kod,'kirmizi',/^191/.test(t.kod)?'Alış / e-Fatura':/^60/.test(t.kod)?'Mizan–beyan farkı':'Satış / e-Arşiv',`${t.kod} ${t.ad}: kayıt bakiyesi ${tl(t.bakiye)}, kaynak toplamı ${tl(t.toplam)}. Fark ${tl(t.fark)}.`,'Hesabın muavinini kaynak listeyle fatura bazında karşılaştırın; eksik, fazla veya yanlış hesaba atılmış kaydı düzeltin.',t.fark);
    else if(kaynakli&&Math.abs(t.fark)>=0.01)NOT.push(`${t.kod} hesabında ${tl(t.fark)} TL yuvarlama farkı var.`)}
  if(saIade.length){const g=r2(saIade.reduce((q,x)=>q+x.kdv,0)),ti=tablo.filter(t=>t.leaf&&/^391/.test(t.kod)&&/iade/.test(norm(t.ad))),kv=r2(ti.reduce((q,t)=>q+t.bakiye,0));
    NOT.push(`Alınan malların iadesi: GİB'de ${saIade.length} iade faturası, KDV ${tl(g)}${ti.length?`; ${ti.map(t=>t.kod).join(', ')} kaydı ${tl(kv)}${Math.abs(g-kv)<1?', tutarlı':`, fark ${tl(kv-g)}`}`:'; kayıtta iade hesabı bulunamadı, satış KDV hesabına girilmiş olabilir'}. Beyannamede "Alınan Malların İadesi" satırıyla da karşılaştırın.`)}
  {const ay=inv.filter(x=>!x.kanalKesin&&!x.iptal&&x.kanal==='e-fatura');if(ay.length)NOT.push(`${ay.length} belgenin listesinde e-fatura / e-arşiv ayrımı yok (Luca ve GİB listeleri yalnızca SATIS, TEVKİFAT, İSTİSNA gibi türü veriyor); bu belgeler tabloda e-fatura sütununda gösterildi. Ayrım için Rahat Aktarım gelen/giden listesini de yükleyin; aynı belgeler oradan eşleşip doğru sütuna geçer.`)}
  const kaynaksiz=tablo.filter(t=>t.leaf&&t.bakiye&&!KOL.some(k=>t.src[k]));if(kaynaksiz.length)NOT.push('Kaynakla karşılaştırılamayan hesaplar: '+kaynaksiz.map(t=>`${t.kod} ${t.ad} (${tl(t.bakiye)})`).join('; ')+'. Bunları belgeyle elle kontrol edin.');
  // beyan karşılaştırması
  const sumT=(re,f)=>r2(tablo.filter(t=>t.leaf&&re.test(t.kod)).reduce((s,t)=>s+f(t),0));
  const mizR=(re,r,f)=>{const ts=tablo.filter(t=>t.leaf&&re.test(t.kod)&&ORAN(t.ad)===r&&!/(^|[^a-z])tevkif(?!atsiz)|sorumlu|iade/.test(norm(t.ad)));return ts.length?r2(ts.reduce((s,t)=>s+f(t),0)):null};
  const gibR=(arr,key,r)=>r2(arr.reduce((s,x)=>s+(x[key][r]||0),0));
  const satir=(ad,bv,mv,gv,kat)=>{let fark=has(bv)&&has(mv)?r2(bv-mv):null;let d=fark==null?(has(bv)?'Karşılaştırılamadı':''):Math.abs(fark)<0.01?'Tutarlı':Math.abs(fark)<5?'Yuvarlama farkı':'Fark var';
    if(fark==null&&has(bv)&&has(gv)){const gf=r2(bv-gv);fark=gf;d=Math.abs(gf)<5?'Kayıt yok · GİB ile tutarlı':'Kayıt yok · GİB ile fark var';
      if(Math.abs(gf)>=5&&/toplam/.test(ad))bul('g'+kars.length,'sari',kat,`${ad}: beyanda ${tl(bv)}, GİB kaynaklarında ${tl(gv)}. Fark ${tl(gf)}. Mizan veya defter yüklenmediği için hangisinin doğru olduğu belirlenemedi.`,'Mizanı veya defter kayıtlarını yükleyip kontrolü yeniden çalıştırın; GİB listelerinin türünün (alış / satış) doğru seçildiğini kontrol edin.',gf)}
    kars.push({ad,beyan:has(bv)?bv:null,mizan:has(mv)?mv:null,gib:has(gv)?gv:null,fark,durum:d});
    if(d==='Fark var')bul('b'+kars.length,'kirmizi',kat,`${ad}: beyanda ${tl(bv)}, kayıtta ${tl(mv)}. Fark ${tl(fark)}.`,'Beyanname ile kaydı karşılaştırıp hatalı olanı düzeltin.',fark)};
  const rates=[...new Set([...Object.keys(bey.matrah||{}),...Object.keys(bey.hkdv||{})])].sort((a,b)=>a-b);
  const oransiz=tablo.filter(t=>t.leaf&&/^600/.test(t.kod)&&!ORAN(t.ad)&&t.bakiye);const oSum=r2(oransiz.reduce((a,t)=>a+t.bakiye,0));
  const satirM=(r)=>{const bv=bey.matrah[r],mv=mizR(/^600/,r,t=>t.bakiye);if(oransiz.length&&has(bv)&&has(mv)&&Math.abs(bv-mv-oSum)<1){kars.push({ad:`Matrah %${r}`,beyan:bv,mizan:r2(mv+oSum),gib:r2(gibR(sa,'m',r)+(zM[r]||0)),fark:r2(bv-mv-oSum),durum:'Tutarlı (oranı yazmayan hesap dahil)'});NOT.push(`Matrah %${r}: hesap adında oran yazmayan ${oransiz.map(t=>`${t.kod} ${t.ad} (${tl(t.bakiye)})`).join(', ')} bu orana dahil edildi; beyanla tutarlı. Hesap adına oranı yazmanız sonraki kontrolleri netleştirir.`);mOk[r]=true;return}
    satir(`Matrah %${r}`,bv,mv,r2(gibR(sa,'m',r)+(zM[r]||0)),'Mizan–beyan farkı');const k=kars[kars.length-1];if(k&&k.durum==='Tutarlı')mOk[r]=true};const mOk={};
  for(const r of rates)satirM(r);
  if(false)for(const r of rates)satir(`Matrah %${r}`,bey.matrah[r],mizR(/^600/,r,t=>t.bakiye),r2(gibR(sa,'m',r)+(zM[r]||0)),'Mizan–beyan farkı');
  for(const r of rates){const bv=bey.hkdv[r],mv=mizR(/^391/,r,t=>t.bakiye);if(mOk[r]&&has(bv)&&has(mv)&&Math.abs(bv-mv)>=5&&Math.abs(bv-mv)<=Math.max(5,bv*0.0005)){kars.push({ad:`Hesaplanan KDV %${r}`,beyan:bv,mizan:mv,gib:r2(gibR(sa,'k',r)+(zK[r]||0)),fark:r2(bv-mv),durum:'Yuvarlama farkı'});NOT.push(`Hesaplanan KDV %${r}: beyan ${tl(bv)}, kayıt ${tl(mv)}; ${tl(bv-mv)} TL fark matrah tutarlı olduğu için yuvarlamadan geliyor (beyanname KDV'yi matrah × oran ile, kayıt fatura bazında hesaplıyor).`);continue}
    satir(`Hesaplanan KDV %${r}`,bv,mv,r2(gibR(sa,'k',r)+(zK[r]||0)),'Mizan–beyan farkı')}
  const m391=has_.miz&&tablo.some(t=>/^391/.test(t.kod))?sumT(/^391/,t=>t.bakiye):null,m191=has_.miz&&tablo.some(t=>/^191/.test(t.kod))?sumT(/^191/,t=>t.bakiye):null;
  {const hy=kars.filter(k=>/^Hesaplanan KDV %/.test(k.ad));const yuv=hy.length&&hy.every(k=>/Tutarlı|Yuvarlama/.test(k.durum));if(yuv&&has(o.hesaplanan)&&m391!=null&&Math.abs(o.hesaplanan-m391-hy.reduce((a,k)=>a+(k.fark||0),0))<1){kars.push({ad:'Hesaplanan KDV toplam',beyan:o.hesaplanan,mizan:m391,gib:has_.gS||zVar?r2(sa.reduce((s,x)=>s+x.kdv,0)+zTop_(zK)):null,fark:r2(o.hesaplanan-m391),durum:Math.abs(o.hesaplanan-m391)<0.01?'Tutarlı':'Yuvarlama farkı'})}else satir('Hesaplanan KDV toplam',o.hesaplanan,m391,has_.gS||zVar?r2(sa.reduce((s,x)=>s+x.kdv,0)+zTop_(zK)):null,'Mizan–beyan farkı')}
  for(const r of Object.keys(bey.ikdv||{}).sort((a,b)=>a-b))satir(`İndirilecek KDV %${r}`,bey.ikdv[r],mizR(/^191/,r,t=>t.bakiye),r2(al.reduce((s,x)=>s+pay(x,r),0)),'Alış / e-Fatura');
  if(has(bey.sorumlu)||al.some(x=>x.tev))satir('Sorumlu sıfatıyla ödenen KDV',has(bey.sorumlu)?bey.sorumlu:0,has_.miz?sumT(/^191/,t=>/(^|[^a-z])tevkif(?!atsiz)|sorumlu/.test(norm(t.ad))?t.bakiye:0):null,r2(al.reduce((s,x)=>s+x.tev,0)),'Tevkifat / KDV-2');
  {const lf=re=>tablo.filter(t=>t.leaf&&re(t));const sb=a=>a.length?r2(a.reduce((q,t)=>q+t.bakiye,0)):null;
    const i191=lf(t=>/^191/.test(t.kod)&&/iade/.test(norm(t.ad)));if(has(bey.satisIade)||i191.length)satir('Satış iadesi KDV (indirim)',has(bey.satisIade)?bey.satisIade:null,has_.miz?sb(i191):null,pus.length||alIade.length?r2(pus.reduce((q,x)=>q+x.kdv,0)+alIade.reduce((q,x)=>q+x.kdv,0)):null,'Satış iadesi');
    const i391=lf(t=>/^391/.test(t.kod)&&/iade/.test(norm(t.ad)));if(has(bey.iadeK)||saIade.length)satir('Alınan malların iadesi KDV',has(bey.iadeK)?bey.iadeK:null,has_.miz?sb(i391):null,saIade.length?r2(saIade.reduce((q,x)=>q+x.kdv,0)):null,'Mizan–beyan farkı');
    const ist=lf(t=>/^60[0-2]/.test(t.kod)&&(ORAN(t.ad)==='0'||/istisna/.test(norm(t.ad))));const gI=r2(sa.filter(x=>x.istisna||(!x.kdv&&x.m['0'])).reduce((q,x)=>q+(x.m['0']||0),0));
    if(has(bey.istisna)&&(bey.istisna||ist.length||gI))satir('İstisna kapsamındaki işlemler',bey.istisna,has_.miz?sb(ist):null,gI||null,'Mizan–beyan farkı')}
  const buDon=has(o.indirimler)?r2(o.indirimler-(o.devredenOnceki||0)):null;
  satir('Bu dönem indirim toplamı',buDon,m191,has_.gA?r2(al.reduce((s,x)=>s+x.kdv,0)):null,'Mizan–beyan farkı');
  const od=onceki&&onceki.ozet&&has(onceki.ozet.sonrakiDevreden)?onceki.ozet.sonrakiDevreden:null;
  kars.push({ad:'Önceki dönemden devreden KDV',beyan:has(o.devredenOnceki)?o.devredenOnceki:null,mizan:od,gib:null,fark:od!=null&&has(o.devredenOnceki)?r2(o.devredenOnceki-od):null,durum:od==null?'Doğrulanamadı: önceki ayın kontrolü yok':Math.abs(o.devredenOnceki-od)<0.01?'Tutarlı (geçen ay)':'Fark var'});
  if(od!=null&&has(o.devredenOnceki)&&Math.abs(o.devredenOnceki-od)>=0.01)bul('devir','kirmizi','Devreden KDV',`Beyandaki önceki dönemden devreden ${tl(o.devredenOnceki)}, geçen ayın sonraki döneme devredeni ${tl(od)}.`,'Devreden KDV\'yi geçen ayın beyannamesine göre düzeltin.',o.devredenOnceki-od);
  if(has(o.hesaplanan)&&has(o.indirimler)){const net=r2(o.indirimler-o.hesaplanan);
    kars.push({ad:'Sonraki döneme devreden KDV',beyan:has(o.sonrakiDevreden)?o.sonrakiDevreden:null,mizan:net>0?net:0,gib:null,fark:has(o.sonrakiDevreden)?r2(o.sonrakiDevreden-(net>0?net:0)):null,durum:!has(o.sonrakiDevreden)?'':Math.abs(o.sonrakiDevreden-(net>0?net:0))<1?'Tutarlı (indirimler − hesaplanan)':'Fark var'});
    if(has(o.sonrakiDevreden)&&Math.abs(o.sonrakiDevreden-(net>0?net:0))>=1)bul('arit','kirmizi','Diğer',`Sonraki döneme devreden ${tl(o.sonrakiDevreden)}, indirimler − hesaplanan ${tl(net)}.`,'Beyandaki tutarları yeniden kontrol edin.',o.sonrakiDevreden-net);
    if(net<0&&has(o.odenecek)&&Math.abs(-net-o.odenecek)>=1)bul('arit2','kirmizi','Diğer',`Ödenecek KDV ${tl(o.odenecek)}, hesaplanan − indirimler ${tl(-net)}.`,'Beyandaki tutarları yeniden kontrol edin.',-net-o.odenecek)}
  const kk=has(o.krediKarti)?o.krediKarti:null,pos=has(o.pos)?o.pos:null;
  kars.push({ad:'Kredi kartı ile tahsil edilen (KDV dahil) / GİB POS',beyan:kk,mizan:pos,gib:null,fark:kk!=null&&pos!=null?r2(kk-pos):null,durum:pos==null?'POS tutarı girilmedi':Math.abs(kk-pos)<1?'Tutarlı':'Fark var: açıklama gerekli'});
  if(pos!=null&&pos>0&&!kk)bul('pos','kirmizi','POS / kredi kartı',`GİB POS toplamı ${tl(pos)}, beyanda kredi kartı satırı boş.`,'Kredi kartı satırını POS bilgilerine göre doldurun.',pos);
  else if(pos!=null&&kk!=null&&Math.abs(kk-pos)>=1)bul('pos','sari','POS / kredi kartı',`GİB POS toplamı ${tl(pos)}, beyandaki kredi kartı tutarı ${tl(kk)}. Fark ${tl(kk-pos)}.`,'Fark avans, önceki dönem taksidi veya POS dışı tahsilattan geliyorsa not edin; değilse beyanı düzeltin.',kk-pos);
  // fatura bazında eşleşme
  const liste=(a,n=8)=>a.slice(0,n).join(', ')+(a.length>n?` ve ${a.length-n} belge daha`:'');
  const esle=(gib,kay,yon)=>{if(!gib.length||!kay.size)return null;const g=new Map();for(const x of gib)g.set(x.no,r2((g.get(x.no)||0)+x.kdv-(yon==='alis'?0:0)));
    let yok=[...g.keys()].filter(n=>!kay.has(n)&&Math.abs(g.get(n))>=1),fazla=[...kay.keys()].filter(n=>!g.has(n)&&!ipt.has(n)&&!(yon==='satis'&&/^\d{1,5}$/.test(n))&&!(yon==='alis'&&(ydNo.has(n)||aciklanan.has(n))));const fk=[...g.keys()].filter(n=>kay.has(n)&&Math.abs(kay.get(n)-g.get(n))>=1);
    const nh=[];if(fazla.length<=30&&yok.length<=30)for(const n of [...yok]){const ad=fazla.filter(f=>Math.abs(kay.get(f)-g.get(n))<0.05);const ters=yok.filter(y=>Math.abs(g.get(y)-g.get(n))<0.05);const m=ad.length===1&&ters.length===1?ad[0]:null;if(m){nh.push(`${n} → kayıtta ${m}`);yok=yok.filter(x=>x!==n);fazla=fazla.filter(x=>x!==m)}}
    if(nh.length)bul(yon+'num','sari',yon==='alis'?'Alış / e-Fatura':'Satış / e-Arşiv',`Belge numarası kayda yanlış yazılmış (tutar aynı) ${nh.length} belge: ${liste(nh,6)}.`,'Kayıttaki belge numarasını düzeltin.',0);
    const A=yon==='alis'?'alış':'satış',K=yon==='alis'?'Alış / e-Fatura':'Satış / e-Arşiv',H=yon==='alis'?'191':'391';
    if(yok.length&&!(yon==='satis'&&satEksik&&yok.length>20))bul(yon+'yok',yon==='alis'?'sari':'kirmizi',K,`GİB ${A} listesinde olup ${defterMod?'defter kayıtlarında':H+' muavininde'} olmayan ${yok.length} belge (KDV ${tl(yok.reduce((s,n)=>s+g.get(n),0))}): ${liste(yok)}.`,yon==='alis'?'Alış belgeleri kayda alınmamış; KDV\'si belgenin ait olduğu takvim yılı içinde indirilebilir. Gider ve KDV kaydını yapın.':'Satış belgeleri kayda alınmamış; satış beyan dışı kalmış olabilir. Kaydı yapın ve gerekirse düzeltme beyannamesi verin.',yok.reduce((s,n)=>s+g.get(n),0));
    const fkA=yon==='alis'?fk.filter(n=>kay.get(n)<g.get(n)):[];if(fkA.length)bul(yon+'farkd','sari',K,`KDV'si kayda eksik alınmış ${fkA.length} belge: ${liste(fkA.map(n=>`${n} (GİB ${tl(g.get(n))}, kayıt ${tl(kay.get(n))})`),5)}.`,'Eksik KDV belgenin ait olduğu takvim yılı içinde indirilebilir; kaydı düzeltin.',fkA.reduce((s,n)=>s+g.get(n)-kay.get(n),0));
    const fkK=fk.filter(n=>!fkA.includes(n));
    if(fkK.length)bul(yon+'fark','kirmizi',K,`KDV tutarı GİB ile ${defterMod?'defter kayıtlarında':H+' muavininde'} farklı olan ${fkK.length} belge: ${liste(fkK.map(n=>`${n} (GİB ${tl(g.get(n))}, kayıt ${tl(kay.get(n))})`),5)}.`,'Kaydı belgedeki KDV tutarına göre düzeltin.',fkK.reduce((s,n)=>s+kay.get(n)-g.get(n),0));
    if(fazla.length&&!(yon==='alis'&&alEksik)&&!(yon==='satis'&&satEksik))bul(yon+'fazla','sari',K,`${defterMod?'defter kayıtlarında':H+' muavininde'} olup GİB listesinde olmayan ${fazla.length} belge: ${liste(fazla)}.`,'Kâğıt fatura, fiş veya gümrük belgesi ise sorun yok. e-Fatura/e-Arşiv/e-SMM ise belge GİB\'e henüz raporlanmamış olabilir: GİB sorgusu raporlanma tarihine göre çalışır, sonraki ayın sorgusunda tekrar arayın; yine çıkmazsa belgenin GİB karşılığını düzenleyenden isteyin.',fazla.reduce((s,n)=>s+kay.get(n),0));
    return{gib:g.size,kayit:kay.size,eslesen:[...g.keys()].filter(n=>kay.has(n)&&Math.abs(kay.get(n)-g.get(n))<1).length,yok:yok.length,fazla:fazla.length,fark:fk.length}};
  const eA=esle(al,kA,'alis'),eS=esle([...sa,...saIade],kS,'satis');
  const ik=[...ipt].filter(n=>kA.has(n)||kS.has(n));if(ik.length)bul('iptal','kirmizi','İptal / mükerrer',`İptal veya red edilmiş ${ik.length} belge kayıtta duruyor: ${liste(ik)}.`,'Red ve iptal edilen faturalar ve tekrar eden satırları kayıttan çıkarılmalı.',0);
  const iadeHesap=a=>/iade/.test(accAd(a));
  {const iad=new Map();for(const x of mu.filter(x=>/^191/.test(x.acc)&&iadeHesap(x.acc)))iad.set(x.no,r2((iad.get(x.no)||0)+x.b-x.a));
    const satK=new Map();for(const x of mu.filter(x=>/^391/.test(x.acc)&&!iadeHesap(x.acc)))satK.set(x.no,r2((satK.get(x.no)||0)+x.a-x.b));
    const fazlaIade=[...iad].filter(([n,v])=>satK.has(n)&&v>satK.get(n)+0.05);
    if(fazlaIade.length)bul('iadefazla','kirmizi','Satış / e-Arşiv',`Satış iadesi KDV'si, aynı faturanın hesaplanan KDV'sinden fazla olan ${fazlaIade.length} belge: ${liste(fazlaIade.map(([n,v])=>`${n} (iade ${tl(v)}, satış ${tl(satK.get(n))})`),5)}.`,'İade kaydını faturayla karşılaştırın; mükerrer iade kaydı varsa çıkarın.',fazlaIade.reduce((a,[n,v])=>a+v-satK.get(n),0));
    const parca=[...iad].filter(([n])=>mu.filter(x=>x.no===n&&/^191/.test(x.acc)&&iadeHesap(x.acc)).length>1).length;
    if(iad.size)NOT.push(`Satış iadeleri: ${iad.size} belge, iade KDV'si ${tl([...iad.values()].reduce((a,v)=>a+v,0))}${parca?`; ${parca} belgede iade birden fazla satır veya parça iade olarak girilmiş, bu ay satışı bulunanlarda iade toplamı satış KDV'sini aşmıyor`:''}.`)}
  if(pus.length){const top=r2(pus.reduce((a,x)=>a+x.kdv,0));const ser=[...new Set(pus.map(x=>x.seri+(x.pno||'')))].length;
    const bil=pus.filter(x=>!x.orig);if(bil.length)bul('pusbil','sari','Satış iadesi',`Hangi satışa ait olduğu ve iade edenin kim olduğu yazılmayan ${bil.length} gider pusulası (KDV ${tl(bil.reduce((a,x)=>a+x.kdv,0))}): ${liste(bil.map(x=>`${x.seri}-${x.pno}${x.ad?' ('+x.ad.slice(0,25)+')':''} ${tl(x.kdv)}`),6)}.`,'İade KDV’sinin indirilebilmesi için iadenin hangi satış faturasına ait olduğu ve iade eden alıcı belgelenmeli. Belgeyle tamamlanamıyorsa bu KDV indirimden çıkarılmalı.',bil.reduce((a,x)=>a+x.kdv,0));
    const pn=new Map();for(const x of pus){if(!x.pno)continue;const k=x.seri+'-'+x.pno;(pn.get(k)||pn.set(k,new Set()).get(k)).add(norm(x.ad))}const cift=[...pn].filter(([,v])=>v.size>1).map(([k])=>k);
    if(cift.length)bul('puscift','sari','Satış iadesi',`Aynı numara iki farklı kişiye kullanılmış ${cift.length} gider pusulası: ${liste(cift,8)}.`,'Her iade eden kişi için ayrı numaralı pusula düzenlenmeli; numarayı düzeltip pusulaları ayırın.',0);
    const sK=new Map();for(const x of sa)sK.set(x.no,r2((sK.get(x.no)||0)+x.kdv));const io=new Map();for(const x of pus)if(x.orig)io.set(x.orig,r2((io.get(x.orig)||0)+x.kdv));
    const asan=[...io].filter(([n,v])=>sK.has(n)&&v>sK.get(n)+0.05);if(asan.length)bul('pusasan','kirmizi','Satış iadesi',`İade KDV’si, iade edilen satış faturasının KDV’sinden fazla olan ${asan.length} belge: ${liste(asan.map(([n,v])=>`${n} (iade ${tl(v)}, fatura ${tl(sK.get(n))})`),5)}.`,'Fazla iade KDV’si indirim konusu yapılamaz; pusulayı ve kaydı düzeltin.',asan.reduce((a,[n,v])=>a+v-sK.get(n),0));
    const buAy=[...io.keys()].filter(n=>sK.has(n)).length,eski=io.size-buAy;
    NOT.push(`Satış iadesi (gider pusulası): ${pus.length} satır, ${ser} pusula, iade KDV’si ${tl(top)}. İade edilen ${io.size} faturanın ${buAy} tanesi bu ayın GİB satış listesinde var ve hiçbirinde iade satışı aşmıyor${eski?`; ${eski} tanesi önceki aylara ait (o ayların satış listesiyle kontrol edilebilir)`:''}.`);
    const bs=[...new Set(pus.map(x=>x.seri))];for(const sr of bs){const ns=[...new Set(pus.filter(x=>x.seri===sr&&x.pno).map(x=>+x.pno))].sort((a,b)=>a-b);if(ns.length<20)continue;let g=0;const gl=[];for(let i=1;i<ns.length;i++){const d=ns[i]-ns[i-1]-1;if(d>0&&d<5){g+=d;if(gl.length<6)gl.push(ns[i-1]+1+(d>1?'–'+(ns[i]-1):''))}}if(g)NOT.push(`${sr} serisi gider pusulalarında ${g} numara atlanmış (ör. ${gl.join(', ')}); iptal edilen pusulaysa sorun yok, değilse eksik kayıt olabilir.`)}}
  const muk=[...mukk].filter(([k,v])=>v>1&&!iadeHesap(k.split('|')[0])).map(([k])=>k.split('|')[1]);if(muk.length)bul('muk','sari','İptal / mükerrer',`Olası mükerrer kayıt: muavinde aynı belge aynı hesaba aynı tutarla iki satır olarak geçen ${muk.length} belge: ${liste([...new Set(muk)])}.`,'Tekrarlanan satırı kayıttan çıkarın.',0);
  // kritik notlar
  const K=[];
  if(has_.gS)K.push(`Satış: GİB'de ${new Set([...sa,...saIade].map(x=>x.no)).size} satış belgesi${saIade.length?` (${saIade.length} tanesi alınan malların iadesi faturası)`:''}${eS?`, ${eS.eslesen} tanesi ${defterMod?'defter gelir kayıtlarıyla':'muavin 391 ile'} fatura no ve KDV tutarıyla eşleşti`:''}. İptal/red ${[...ipt].length} belge${ipt.size?' kontrolden çıkarıldı':''}.`);
  if(has_.gA){const kan={};for(const x of al)kan[x.kanal]=(kan[x.kanal]||0)+1;K.push(`Alış: ${al.length} belge (${Object.entries(kan).map(([a,b])=>`${b} ${a}`).join(', ')})${eA?`, ${eA.eslesen} tanesi ${defterMod?'defter gider kayıtlarıyla':'muavin 191 ile'} eşleşti`:''}.`)}
  let tevOzet=null;
  if(tevSat.length){const yi=tevSat.filter(s=>!s.tur.startsWith('Yurt dışı')),yd=tevSat.filter(s=>s.tur.startsWith('Yurt dışı'));const tt=r2(tevSat.reduce((a,s)=>a+s.tev,0));
    const m109=has_.miz?sumT(/^191/,t=>/(^|[^a-z])tevkif(?!atsiz)|sorumlu|kdv 2/.test(norm(t.ad))?t.bakiye:0):null,m360=has_.miz?sumT(/^360/,t=>t.bakiye):null;
    const or={};for(const s of yi)or[s.oran]=(or[s.oran]||0)+1;
    K.push(`Tevkifat: ${yi.length?`${yi.length} yurtiçi tevkifatlı belge (${Object.entries(or).map(([a,b])=>`${b} adet ${a}`).join(', ')}; satıcıya ödenen ve tevkif edilen kısım belge bazında toplanıp GİB ile karşılaştırıldı)`:''}${yi.length&&yd.length?', ':''}${yd.length?`${yd.length} yurt dışı hizmet faturası (KDV'nin tamamı sorumlu sıfatıyla, ${tl(tevYd)})`:''}. Toplam tevkif ${tl(tt)}${m109!=null?`; 191 sorumlu hesabı ${tl(m109)}`:''}${m360!=null&&m360?`; KDV-2 tahakkuku (360) ${tl(m360)}`:''}${has(bey.sorumlu)?`; beyandaki sorumlu sıfatıyla ödenen ${tl(bey.sorumlu)}`:''}. Hizmet türünün tevkifat oranına uyduğunu faturadan teyit edin.`);
    const sm=(a,f)=>r2(a.reduce((x,s)=>x+(s[f]||0),0));
    tevOzet={yurtici:{adet:yi.length,satici:sm(yi,'satici'),tev:sm(yi,'tev'),toplam:sm(yi,'toplam'),gibTev:sm(yi.filter(s=>s.gibTev!=null),'gibTev')},yurtdisi:{adet:yd.length,tev:sm(yd,'tev')},toplamTev:tt,m109,m360:m360||null,beyan:has(bey.sorumlu)?bey.sorumlu:null};
    if(m360&&m109!=null&&Math.abs(m360-m109)>=0.01&&Math.abs(m360-m109)<5)K.push(`KDV-2 tahakkuku (360) ile 191 sorumlu hesabı arasında ${tl(m109-m360)} TL kuruş farkı var.`);
    else if(m360&&m109!=null&&Math.abs(m360-m109)>=5)bul('kdv2','kirmizi','Tevkifat / KDV-2',`KDV-2 tahakkuku (360) ${tl(m360)}, 191 sorumlu hesabı ${tl(m109)}. Fark ${tl(m109-m360)}.`,'KDV-2 beyanı ile 191.109 kaydını belge bazında karşılaştırın.',m109-m360)}
  if(has(o.hesaplanan)&&m391!=null&&Math.abs(o.hesaplanan-m391)>=0.01&&Math.abs(o.hesaplanan-m391)<5)K.push(`Hesaplanan KDV'de beyan ile kayıt arasında ${tl(o.hesaplanan-m391)} TL yuvarlama farkı var: beyanname KDV'yi matrah × oran ile, kayıt fatura bazında hesaplıyor. Mahsup fişinde kapatın.`);
  if(kk!=null&&(has_.gS||zVar)){const top=r2(sa.reduce((s,x)=>s+x.kdv+Object.values(x.m).reduce((a,b)=>a+b,0),0)+zT);K.push(`Kredi kartı satırı ${tl(kk)} (KDV dahil); GİB ve Z raporlarına göre KDV dahil satış ${tl(top)}${top>kk?`, aradaki ${tl(top-kk)} kart dışı tahsilat (nakit, havale, yemek kartı vb.) olmalı`:''}. ${pos==null?'GİB POS toplamı girilmediği için doğrulanamadı.':''}`)}
  if(od==null&&has(o.devredenOnceki))K.push(`Önceki dönemden devreden ${tl(o.devredenOnceki)} geçen ayın kaydıyla karşılaştırılamadı; geçen ayın kontrolünü de bu ekrandan yapın.`);
  const ggz=miz.filter(m=>/^689/.test(m.kod)&&/gecikme/.test(norm(m.ad))&&leaf(m));if(ggz.length)K.push(`KDV dışı: ${ggz.map(m=>`${m.kod} ${m.ad} ${tl(m.bb)}`).join(', ')} kanunen kabul edilmeyen giderdir; geçici ve yıllık beyanda KKEG olarak ilave edin.`);
  if(zVar){const zl=(zData&&zData.zler)||[];const dolu=zl.filter(z=>num(z.top));const gt=r2(zl.reduce((s,z)=>s+num(z.top),0)),gk=r2(zl.reduce((s,z)=>s+num(z.kdv),0));
    let s=`Z raporu: KDV dahil ${tl(zT)}, KDV ${tl(zV)} (${Object.keys(zK).map(r=>r==='?'?'oran belirsiz':'%'+r).join(', ')})`;
    if(zl.length){s+=`; ${zl.length} Z, satış olan gün ${dolu.length}${zl.some(z=>+z.fisAdedi)?`, fiş ${zl.reduce((a,z)=>a+(+z.fisAdedi||0),0)}`:''}. Günlük toplamlar ${Math.abs(gt-zT)<0.01&&Math.abs(gk-zV)<0.01?'dönem toplamıyla tutarlı':`dönem toplamından farklı (günlük toplam ${tl(gt)} / KDV ${tl(gk)}); fotoğraftaki rakamları kontrol edin`}.`;
      const cg={};for(const z of zl)(cg[z.cihaz||'1']=cg[z.cihaz||'1']||[]).push(parseInt(z.zNo,10));const eks=[];
      for(const [cz,ns] of Object.entries(cg)){const a=ns.filter(n=>!isNaN(n)).sort((x,y)=>x-y);for(let i=1;i<a.length;i++)if(a[i]-a[i-1]<50)for(let n=a[i-1]+1;n<a[i];n++)eks.push(Object.keys(cg).length>1?`${n} (cihaz ${cz})`:n)}
      if(Object.keys(cg).length>1)s+=` ${Object.keys(cg).length} ayrı yazar kasa var.`;
      if(eks.length)s+=` Z numaralarında atlama var: ${eks.slice(0,10).join(', ')}. Eksik Z raporlarını isteyin.`;
      const sifir=zl.filter(z=>!num(z.top)).length;if(sifir)s+=` ${sifir} gün satışsız (0,00) Z alınmış.`}
    else s+='.';K.push(s);
    const dz=def.filter(x=>x.yon==='satis'&&/^\d+$/.test(x.no)&&x.kdv).map(x=>({no:x.no,kdv:x.kdv,top:r2(x.kdv+Object.values(x.m).reduce((a,v)=>a+v,0)),ok:false}));
    const pz=zl.filter(z=>num(z.kdv)).map(z=>({no:bno(z.zNo),kdv:r2(num(z.kdv)),top:r2(num(z.top)),ok:false}));
    if(dz.length&&pz.length){for(const p of pz){const d=dz.find(d=>!d.ok&&d.no===p.no&&Math.abs(d.kdv-p.kdv)<1);if(d){d.ok=p.ok=true}}
      const numHata=[];for(const p of pz.filter(p=>!p.ok)){const d=dz.find(d=>!d.ok&&Math.abs(d.kdv-p.kdv)<0.05);if(d){d.ok=p.ok=true;numHata.push(`Z ${p.no} deftere ${d.no} numarasıyla girilmiş`)}}
      const eksZ=pz.filter(p=>!p.ok),fazZ=dz.filter(d=>!d.ok);
      if(eksZ.length)bul('zeks','kirmizi','Z raporu',`Z raporunda olup deftere girilmemiş ${eksZ.length} Z: ${eksZ.map(p=>`Z ${p.no} (${tl(p.top)} TL, KDV ${tl(p.kdv)})`).join(', ')}. Bu satış beyan dışı kalmış.`,'Z\'yi deftere işleyin; beyanname verildiyse düzeltme beyannamesi verin.',eksZ.reduce((a,p)=>a+p.kdv,0));
      if(fazZ.length)bul('zfaz','kirmizi','Z raporu',`Defterde Z olarak girilmiş ama Z raporlarında karşılığı bulunmayan ${fazZ.length} kayıt: ${fazZ.map(d=>`${d.no} (KDV ${tl(d.kdv)})`).join(', ')}.`,'Kaydın hangi Z\'ye ait olduğunu kontrol edin.',fazZ.reduce((a,d)=>a+d.kdv,0));
      if(numHata.length)bul('znum','sari','Z raporu',`Z numarası deftere yanlış yazılmış (tutar doğru): ${numHata.join('; ')}.`,'Defterdeki Z numaralarını düzeltin.',0);
      K.push(`Z ile defter: ${pz.length} satışlı Z'nin ${pz.length-eksZ.length} tanesi defterde bulundu${numHata.length?`, ${numHata.length} tanesi yanlış numarayla`:''}${eksZ.length?`; ${eksZ.length} Z deftere girilmemiş`:''}. Defter ile Z arasındaki kuruş farkları yuvarlamadır.`)}
    if(zl.length&&(Math.abs(gt-zT)>=1||Math.abs(gk-zV)>=1))bul('zgun','sari','Z raporu',`Z raporlarının günlük toplamı ${tl(gt)} (KDV ${tl(gk)}), dönem toplamı ${tl(zT)} (KDV ${tl(zV)}). Fark ${tl(gt-zT)} / KDV ${tl(gk-zV)}.`,'Fotoğraftaki rakamları ve eksik Z raporu olup olmadığını kontrol edin.',gt-zT)}
  if(defterMod)K.unshift('Kayıt kaynağı: işletme defteri (Defter-Beyan) gelir ve gider kayıtları; tabloda 191, 391 ve 600 satırları defterden oluşturuldu.');
  K.push(...NOT);K.push('Otomatik kontrol dışında kalan: KKEG kısıtları (binek oto, akaryakıt, yemek kartı) ve firmaya özel kurallar.');
  const kr=B.filter(b=>b.seviye==='kirmizi').length,sr=B.filter(b=>b.seviye!=='kirmizi').length;
  const eksik=!has(o.hesaplanan)?'Kontrol eksik: KDV-1 beyannamesi yüklenmediği (veya tutarları yazılmadığı) için beyan kontrol edilemedi; aşağıdaki sonuç yalnızca kayıt ile GİB verisine dayanıyor. ':!has_.miz?'Kontrol eksik: mizan veya defter kayıtları yüklenmediği için beyanname kayıtla karşılaştırılamadı; aşağıdaki sonuç yalnızca beyan ile GİB verisine dayanıyor. ':(!has_.gA&&!has_.gS&&!zVar)?'Kontrol eksik: GİB listeleri yüklenmediği için kayıt GİB verisiyle karşılaştırılamadı. ':satEksik?'Kontrol kısmen eksik: GİB satış listesi tam yüklenmediği için satışlar belge bazında doğrulanamadı. ':alEksik?'Kontrol kısmen eksik: GİB alış listesi tam yüklenmediği için indirilecek KDV belge bazında doğrulanamadı; beyan ile mizan tutarları karşılaştırıldı. ':'';
  const sonuc0=kr?`${kr} kırmızı bulgu var; kapatılmadan onay verilmemeli. Beyanname verildiyse düzeltme beyannamesi değerlendirilmeli.${sr?` Ayrıca ${sr} sarı nokta açıklanmalı.`:''}`:sr?`Beyanname kayıtlar ve GİB verisiyle tutarlı; kırmızı bulgu yok. ${sr} sarı nokta açıklanmalı.`:'Beyanname kayıtlar ve GİB verisiyle tutarlı; bulgu yok.';
  const sonuc=eksik?eksik+(kr||sr?(kr?`${kr} kırmızı, `:'')+`${sr} sarı bulgu var; `:'Bulgu yok; ')+'eksik dosyalar yüklenince kontrolü yeniden çalıştırın.':sonuc0;
  const kay={beyan:pdf||has(o.hesaplanan),mizan:has_.miz&&!defterMod,defter:defterMod,muavin:has_.mu,ayrim:tabs.some(t=>t.tur==='gib'),earsiv:has_.gA||has_.gS,esmm:al.some(x=>x.kanal==='e-smm'),pusula:pus.length>0,z:zVar,pos:pos!=null};
  return{sonrakiAyBelge,tevkifat:tevSat,tevOzet,bulgular:B,kaynaklar:Object.fromEntries(Object.entries(kay).filter(([,v])=>v)),tablo,kars,notlar:K,sonuc,not:sonuc}}
