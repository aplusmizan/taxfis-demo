// ---------- Aktarım sekmesi: kayıt önerisi, şef seçimi ve onayı
const AK={sec:null};
const akKodlar=()=>(S.sablonlar||{}).dbs_kodlar||{tur:[],alt:[]};
const akTurAd=k=>{const t=akKodlar().tur.find(x=>String(x.kod)===String(k));return t?t.ad:''};
const akAltAd=(t,a)=>{const x=akKodlar().alt.find(z=>String(z.tur)===String(t)&&String(z.kod)===String(a));return x?x.ad:''};
const akDocs=()=>Object.entries(S.aktarim||{}).filter(([id])=>id.startsWith(kKey()+'_'));
const akKalemTam=k=>k.tur!==''&&k.tur!=null&&k.alt!==''&&k.alt!=null;
const AK_EK=['ÖİV','ÖTV','ETV / BTV / enerji fonu','TRT payı','Konaklama vergisi','Diğer vergi','Ek vergi yok'];
const AK_EK_VARS={'ÖİV':{tur:'5',alt:'218'}};
const akR2=n=>Math.round((+n||0)*100)/100;
const akKural=()=>((S.sablonlar||{}).vergi_kural||{}).k||{};
// KDV'si satırda gelmeyen fatura: KDV tutarı (şef girer ya da aynı satıcının öğrenilmiş oranı)
function akAyrim(s){if(s.oran!=='?')return null;if(s.ayrim&&s.ayrim.kdv!=null)return{...s.ayrim,kaynak:'sef'};
  const r=akKural()[s.vkn];if(!r||r.kdvPay==null||s.vergi==null)return null;const kdv=akR2(s.matrah*r.kdvPay);
  if(kdv>s.vergi+0.01)return{oran:r.oran,kdv,uyumsuz:true};return{oran:r.oran,kdv,kaynak:'kural',ornek:r.fatura}}
// KDV dışındaki vergiler (ÖİV, ÖTV, fon…): ayrı, KDV'siz gider satırı olarak aktarılır
function akEk(s){let tutar;if(s.oran==='?'){const a=akAyrim(s);if(!a||a.uyumsuz)return null;tutar=akR2(s.vergi-a.kdv)}else tutar=akR2(s.ekVergi||0);
  if(Math.abs(tutar)<0.01)return null;const r=akKural()[s.vkn]||{};const tip=s.ekTip||r.tip||'';const k0=s.kalemler[0]||{};const kk=s.kalemler.slice(1).find(k=>!k.kdv)||{};
  const v=AK_EK_VARS[tip]||(/ETV|TRT|Konaklama/.test(tip)?{tur:k0.tur,alt:k0.alt}:{});
  const tur=s.ekTur||r.ekTur||kk.tur||v.tur||'',alt=s.ekAlt||r.ekAlt||kk.alt||v.alt||'';
  return{tutar,tip,tur,alt,kural:!s.ekTip&&!!r.tip,yok:tip==='Ek vergi yok'}}
function akAnaKalemler(s){if(s.oran!=='?')return s.kalemler;const a=akAyrim(s);const k0=s.kalemler[0]||{tur:'',alt:''};
  return [{...k0,tutar:s.matrah,kdv:a&&!a.uyumsuz?a.kdv:null}]}
const AK_DG={2025:9900,2026:12000};
// 12.000 TL'yi (KDV hariç birim) aşan kalem: içeriğe göre yorum.
// Mal görünümlü kalem -> sabit kıymet önerilir; gider kalacaksa şef gerekçe yazar. Hizmet (bakım, onarım, servis…) -> bilgi notu.
const AK_HIZMET=/bak[ıi]m|onar[ıi]m|tamir|servis|i[şs][çc]ilik|hizmet|montaj|kurulum|kira|dan[ıi][şs]man|abonelik|reklam|kargo|nakliye|e[ğg]itim|yenileme|revizyon|tadilat/i;
const akDgTur=b=>AK_HIZMET.test(b.ad||'')?'hizmet':'mal';
const akSk=s=>s.kalemler.some(k=>['2','13'].includes(String(k.tur)));
function akDgUyari(s){const b=(s.buyuk||[]).filter(x=>akDgTur(x)==='mal');if(!b.length||akSk(s)||s.dgGider)return null;return b}
function akDurum(s){if(s.haric)return 'haric';if(s.lucada)return 'oto';if(akDgUyari(s))return 'bos';const ana=akAnaKalemler(s);if(!ana.every(akKalemTam))return 'bos';
  if(s.oran==='?'){const a=akAyrim(s);if(!a||a.uyumsuz)return 'bos'}
  const e=akEk(s);if(e&&(e.yok||!e.tip||!e.tur||!e.alt))return 'bos';
  const otoA=s.oran!=='?'||akAyrim(s).kaynak==='kural';const otoE=!e||e.kural||(AK_EK_VARS[e.tip]&&!s.ekAlt);
  if(s.durum==='bos'||s.kalemler.some(k=>k.manuel))return 'sef';
  return otoA&&otoE&&s.durum==='oto'?'oto':s.durum==='oto'&&(!otoA||!otoE)?'sef':s.durum}
function akVergiHtml(s,i,kilit){const a=akAyrim(s);const e=akEk(s);let h='';
  if(s.oran==='?'){const oranOpt=['20','10','1','0'].map(o=>`<option ${String((a&&a.oran)||'20')===o?'selected':''}>${o}</option>`).join('');
    h+=`<div class="muted">Faturadaki vergiler toplamı: <b>${s.vergi==null?'?':n2(s.vergi)}</b></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center"><label class="muted" for="akvo${i}">KDV %</label><select id="akvo${i}" data-akvo="${i}" ${kilit?'disabled':''}>${oranOpt}</select>
    <label class="muted" for="akvk${i}">KDV tutarı</label><input id="akvk${i}" data-akvk="${i}" inputmode="decimal" style="width:90px" value="${a?String(a.kdv).replace('.',','):''}" ${kilit?'disabled':''}></div>
    ${a&&a.hesap&&a.kaynak==='sef'?`<div class="muted">%${esc(a.oran)} ile hesaplandı (diğer vergiler KDV matrahına dahil). Faturadaki KDV farklıysa tutarı düzeltin.</div>`:''}${a&&a.kaynak==='kural'?`<div class="muted">Otomatik: ${esc(a.ornek||'')} faturasındaki şef ayrımının oranı uygulandı.</div>`:''}${a&&a.uyumsuz?`<div class="muted" style="color:#b42318">Öğrenilen oran bu faturaya uymadı; KDV'yi faturadan girin.</div>`:''}`}
  if(e){const tipOpt=`<option value="">— vergi türü —</option>`+AK_EK.map(t=>`<option ${e.tip===t?'selected':''}>${t}</option>`).join('');
    const turOpt=`<option value="">— kayıt türü —</option>`+akKodlar().tur.map(t=>`<option value="${esc(t.kod)}" ${String(e.tur)===String(t.kod)?'selected':''}>${esc(t.ad)}</option>`).join('');
    const altOpt=`<option value="">— alt tür —</option>`+akKodlar().alt.filter(x=>String(x.tur)===String(e.tur)).map(x=>`<option value="${esc(x.kod)}" ${String(e.alt)===String(x.kod)?'selected':''}>${esc(x.ad)}</option>`).join('');
    h+=`<div style="border-top:1px dashed var(--line,#ddd);padding-top:4px"><b>KDV dışı vergi: ${n2(e.tutar)}</b> <span class="muted">(KDV'siz ayrı gider satırı)</span></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap"><select data-akvt="${i}" aria-label="Ek vergi türü" ${kilit?'disabled':''}>${tipOpt}</select><select data-akvr="${i}" aria-label="Ek vergi kayıt türü" ${kilit?'disabled':''}>${turOpt}</select><select data-akva="${i}" aria-label="Ek vergi alt türü" ${kilit?'disabled':''}>${altOpt}</select></div>
    ${e.kural?`<div class="muted">Otomatik: bu satıcı için şefin önceki seçimi.</div>`:''}${e.yok?`<div class="muted" style="color:#b42318">Vergiler toplamı ile KDV arasında fark var; vergi türünü seçin.</div>`:''}`}
  return h?`<div class="akv" style="display:grid;gap:4px;margin-top:6px;font-size:12px">${h}</div>`:''}
async function akKuralYaz(s){const r={...(akKural()[s.vkn]||{})};const a=s.oran==='?'?akAyrim(s):null;
  if(a&&!a.uyumsuz&&s.matrah){r.oran=a.oran;r.kdvPay=a.kdv/s.matrah}
  if(s.ekTip){r.tip=s.ekTip;r.ekTur=s.ekTur||r.ekTur||'';r.ekAlt=s.ekAlt||r.ekAlt||''}
  r.fatura=s.fatura;r.donem=kKey();const kur={...akKural(),[s.vkn]:r};S.sablonlar.vergi_kural={k:kur};try{await setDoc('sablonlar/vergi_kural',{k:kur})}catch(e){}}
function vAktarim(){const ds=akDocs();
  if(!ds.length)return akFisPanel()+`<div class="panel empty">${S.donem} dönemi için hazırlanmış aktarım önerisi yok. Fiş fotoğraflarını yukarıdan yükleyin; faturalar toplandığında Claude öneriyi buraya yazar.</div>`;
  if(!AK.sec||!ds.find(([id])=>id===AK.sec))AK.sec=ds[0][0];
  const doc=S.aktarim[AK.sec];const f=S.firmalar[doc.mid]||{ad:doc.mid};const ss=doc.satirlar||[];
  const say={oto:0,kontrol:0,sef:0,bos:0,haric:0};ss.forEach(s=>say[akDurum(s)]++);const tamam=say.bos===0;
  const turOpt=sel=>`<option value="">— seçin —</option>`+akKodlar().tur.map(t=>`<option value="${esc(t.kod)}" ${String(sel)===String(t.kod)?'selected':''}>${esc(t.ad)}</option>`).join('');
  const altOpt=(t,sel)=>`<option value="">— seçin —</option>`+akKodlar().alt.filter(a=>String(a.tur)===String(t)).map(a=>`<option value="${esc(a.kod)}" ${String(sel)===String(a.kod)?'selected':''}>${esc(a.ad)}</option>`).join('');
  const chip={oto:['ok','otomatik'],kontrol:['warn','kontrol et'],sef:['ok','şef seçti'],bos:['bad','şef seçecek'],haric:['warn','aktarılmaz']};
  const rows=ss.map((s,i)=>{const d=akDurum(s);const [c,l]=chip[d];
    const kl=akAnaKalemler(s);return kl.map((k,j)=>`<tr class="ak ${d}">${j===0?`<td rowspan="${kl.length}" class="name"><b>${esc(s.unvan||'')}</b><div class="muted">${esc(s.fatura)} · ${esc(s.tarih)} · ${esc(s.senaryo||'')}</div></td><td rowspan="${kl.length}" class="r num">%${esc(s.oran)}</td>`:''}
      <td class="r num">${n2(k.tutar)}</td><td class="r num">${k.kdv==null?'<span class="chip warn">?</span>':n2(k.kdv)}</td>
      <td><select data-akt="${i}.${j}" aria-label="Gider kayıt türü" ${doc.onay?'disabled':''}>${turOpt(k.tur)}</select><select data-aka="${i}.${j}" aria-label="Gider kayıt alt türü" ${doc.onay?'disabled':''}>${altOpt(k.tur,k.alt)}</select></td>
      ${j===0?`<td rowspan="${kl.length}">${s.lucada?`<span class="chip ok">Luca'da kayıtlı</span><div class="muted akg">${esc(s.lucada)} — aktarım dosyasına alınmaz.</div>`:`<span class="chip ${c}">${l}</span>`}<div class="muted akg">${esc(s.gerekce||'')}</div>${(s.buyuk||[]).length?(()=>{const lim=AK_DG[String(s.tarih).slice(0,4)]||AK_DG[2026];const u=akDgUyari(s);const hz=s.buyuk.filter(b=>akDgTur(b)==='hizmet');const ml=s.buyuk.filter(b=>akDgTur(b)==='mal');
  return `<div class="akv" style="font-size:12px;margin-top:6px;display:grid;gap:4px;${u?'color:#b42318':''}"><div><b>${n2(lim)} TL doğrudan gider sınırını aşan kalem:</b> ${s.buyuk.map(b=>esc(b.ad)+' '+n2(b.birim)+(akDgTur(b)==='hizmet'?' (hizmet)':'')).join(', ')}.</div>
  ${ml.length?(akSk(s)?'<div>Sabit kıymet olarak işaretli; amortismanla gider yazılır.</div>':s.dgGider?`<div>Şef kararı: gider olarak kalıyor — ${esc(s.dgGider)} ${doc.onay?'':`<button class="ghost" data-akdgg="${i}">Geri al</button>`}</div>`:`<div>Mal niteliğinde görünüyor: demirbaş ise gider kayıt türünü Sabit Kıymet Alışı seçin. Gider olarak kalacaksa gerekçe yazın (ör. sarf malzemesi, parça değişimi, değer artırmayan onarım).</div>${doc.onay?'':`<div style="display:flex;gap:4px"><input data-akdgt="${i}" placeholder="Gider kalma gerekçesi" style="flex:1;min-width:0"><button class="ghost" data-akdg="${i}">Gider olarak kalsın</button></div>`}`):''}
  ${hz.length?`<div class="muted" style="color:inherit">Hizmet niteliğinde görünüyor (bakım/onarım/servis): normalde gider. Varlığın değerini artırıyor ya da ömrünü uzatıyorsa aktifleştirilmeli; içeriği faturadan kontrol edin.</div>`:''}</div>`})():''}${akVergiHtml(s,i,!!doc.onay)}${(s.secenek||[]).length&&!doc.onay?`<div class="aksec">${s.secenek.map((o,q)=>`<button class="ghost" data-aks="${i}.${q}" title="Geçmişte ${o.n} kez">${esc(o.ad)} <span class="muted">(${o.n})</span></button>`).join('')}</div>`:''}</td>`:''}</tr>`).join('')}).join('');
  return akFisPanel()+`<div class="panel" style="padding:14px;display:grid;gap:12px">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="sm" for="aksec">Firma</label><select id="aksec">${ds.map(([id,d])=>`<option value="${id}" ${id===AK.sec?'selected':''}>${esc((S.firmalar[d.mid]||{ad:d.mid}).ad)}</option>`).join('')}</select>
      <span class="chip ok">${say.oto} otomatik</span><span class="chip warn">${say.kontrol} kontrol</span><span class="chip ok">${say.sef} şef seçti</span><span class="chip ${say.bos?'bad':'ok'}">${say.bos} boş</span>${say.haric?`<span class="chip warn">${say.haric} aktarılmaz</span>`:''}
      <label class="sm" for="akfk">Faaliyet kodu</label><input id="akfk" inputmode="numeric" maxlength="6" style="width:80px" value="${esc(f.faaliyetKodu||'')}" placeholder="6 hane">${/^\d{6}$/.test(String(f.faaliyetKodu||''))?'':'<span class="chip bad">faaliyet kodu yok</span>'}<span class="muted" style="font-size:12px">Hedef: Luca gider (Ser.Mes.Defteri) · Kaynak: ${esc(doc.kaynak||'')}</span></div>
    <div class="note">Kod dolu gelen satırlar, satıcının geçmiş kayıtlarında tutarlı biçimde aynı türle kaydedildiği satırlar. Emin olunmayan satırlar boş bırakıldı: geçmişteki seçenekler yanında; birine tıklayın ya da listeden seçin. Boş satır kalmadan şef onayı verilemez.</div>
    <div class="tblwrap"><table class="grid akt"><thead><tr><th>Fatura</th><th class="r">KDV</th><th class="r">Tutar</th><th class="r">KDV tutarı</th><th>Gider kayıt türü / alt türü</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="actions">${doc.onay?`<span class="chip ok">Şef onayı: ${esc(doc.onay.tarih)}${doc.onay.kim?' · '+esc(doc.onay.kim):''}</span><button data-akgeri="1">Onayı geri al</button>`:`<button class="pri" data-akonay="1" ${tamam?'':'disabled'}>Şef onayı ver</button>`}<button data-akxl="1" title="Kontrol listesi; Luca'ya yüklenmez">Kontrol listesi (Excel, Luca'ya yüklenmez)</button><button data-akluca3="1" ${doc.onay?'':'disabled'} title="Şef onayından sonra">Luca'ya yükle: deneme (ilk 3 belge)</button><button data-akluca="1" ${doc.onay?'':'disabled'} title="Şef onayından sonra">Luca'ya yükle: tüm belgeler</button>${doc.onay?'':'<span class="muted">Luca dosyası şef onayından sonra açılır.</span>'}${tamam?'':`<span class="muted">${say.bos} satır boş; onay için doldurun.</span>`}</div></div>`}
async function akKaydet(patch){const doc=S.aktarim[AK.sec];const d={...doc,...patch};S.aktarim[AK.sec]=d;await setDoc('aktarim/'+AK.sec,d)}
function akImza(s,imza){const parts=imza.split('+').map(p=>{const kdvli=!p.endsWith('*');const [ta,pay]=p.replace('*','').split(':');const [t,a]=ta.split('/');return{tur:t,alt:a,pay:+pay,kdvli}});
  const kp=parts.filter(p=>p.kdvli).reduce((a,p)=>a+p.pay,0)||1;const r=n=>Math.round(n*100)/100;
  return parts.map(p=>({tur:p.tur,alt:p.alt,tutar:r(s.matrah*p.pay),kdv:p.kdvli&&s.kdv!=null?r(s.kdv*p.pay/kp):0,manuel:true}))}
async function akXl(){const doc=S.aktarim[AK.sec];if(!doc)return;if(!S.dl){toast('Bu görünümde dosya indirilemiyor');return}
  const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('Aktarım');
  ws.columns=[['Durum',12],['Kayıt Tarihi',12],['Belge Tarihi',12],['Belge Türü Kodu',10],['Belge No',20],['VKN/TCKN',13],['Unvan',36],['Gider Kayıt Türü Kodu',8],['Gider Kayıt Türü',30],['Alt Tür Kodu',8],['Alt Tür',40],['Tutar',14],['KDV Oranı',8],['KDV',12],['Gerekçe',50]].map(([h,w])=>({header:h,width:w}));
  ws.getRow(1).font={bold:true};
  for(const s of doc.satirlar){const d=akDurum(s);const D={oto:'Otomatik',kontrol:'Kontrol',sef:'Şef seçti',bos:'BOŞ'}[d];const o=s.oran==='?'?((akAyrim(s)||{}).oran||'?'):s.oran;for(const k of akAnaKalemler(s)){ws.addRow([D,s.tarih,s.tarih,s.belgeTur||'',s.fatura,s.vkn,s.unvan,k.tur,akTurAd(k.tur),k.alt,akAltAd(k.tur,k.alt),k.tutar,o,k.kdv,s.gerekce||''])}const e=akEk(s);if(e)ws.addRow([D,s.tarih,s.tarih,s.belgeTur||'',s.fatura,s.vkn,s.unvan,e.tur,akTurAd(e.tur),e.alt,akAltAd(e.tur,e.alt),e.tutar,0,0,'KDV dışı vergi: '+e.tip])}
  ws.getColumn(12).numFmt='#,##0.00';ws.getColumn(14).numFmt='#,##0.00';
  const f=S.firmalar[doc.mid]||{ad:doc.mid};const ad=f.ad.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü ]+/g,'').trim().split(/\s+/).slice(0,2).join('_');
  try{await S.dl.save({filename:`${ad}_KONTROL_LISTESI_Lucaya_yuklenmez_${kKey()}.xlsx`,data:await wb.xlsx.writeBuffer()});toast('Excel indirildi')}catch(e){if(e&&e.code==='declined')return;toast('Excel oluşturulamadı')}}
const LUCA_BELGE={'1':'Fatura','2':'ÖKC Fişi','3':'Perakende Satış Fişi','4':'Serbest Meslek Makbuzu','5':'Gider Pusulası','6':'Müstahsil Makbuzu','8':'Diğer','9':'e-Fatura','10':'e-Arşiv Fatura','13':'e-Serbest Meslek Makbuzu','18':'e-Bilet','19':'Yolcu Taşıma Bileti','20':'e-Müstahsil Makbuzu','21':'Gümrük Beyannamesi'};
const LUCA_HF=['İŞLEM','KATEGORİ','BELGE TÜRÜ','EVRAK TARİHİ','KAYIT TARİHİ','SERİ NO','EVRAK NO','TCKN/VKN','VERGİ DAİRESİ','SOYADI ÜNVAN','ADI DEVAMI','ADRES','CARİ HESAP','KDV İSTİSNASI','KOD','BELGE TÜRÜ(DB)','ALIŞ/SATIŞ TÜRÜ','KAYIT ALT TÜRÜ','PLAKA NO','MAL VE HİZMET KODU','AÇIKLAMA','MİKTAR','B.FİYAT','TUTAR','TEVKİFAT','KDV ORANI','İŞLEM BEDELİ','MATRAHTAN DÜŞÜLECEK TUTAR','ÖZEL MATRAH ŞEKLİNE DAHİL OLMAYAN BEDEL','KDV TUTARI','TOPLAM TUTAR','KREDİLİ TUTAR','STOPAJ KODU','STOPAJ TUTARI','DÖNEMSELLIK İLKESİ','FAALIYET KODU','ÖDEME TÜRÜ'];
// Luca Hızlı Fiş "Excel Aktarım" aslında CSV okur: ';' ayraçlı, Windows-1254, 36 sütun (şablondaki PLAKA NO yok).
// 03.11.2026'da Yakup Sait Çağlar ile denenerek bulundu: İŞLEM "Gider", ünvanda özel karakter yok, tarih gg/aa/yyyy, ondalık virgül.
const LUCA_CSV=LUCA_HF.filter(h=>h!=='PLAKA NO');
const AK_TRMAP={'Ç':0xC7,'Ğ':0xD0,'İ':0xDD,'Ö':0xD6,'Ş':0xDE,'Ü':0xDC,'ç':0xE7,'ğ':0xF0,'ı':0xFD,'ö':0xF6,'ş':0xFE,'ü':0xFC,'â':0xE2,'Â':0xC2,'î':0xEE,'û':0xFB};
function akCp1254(str){const out=[];for(const ch of str){const c=ch.charCodeAt(0);if(c<128)out.push(c);else if(AK_TRMAP[ch]!=null)out.push(AK_TRMAP[ch]);else out.push(63)}return new Uint8Array(out)}
const akAscii=t=>String(t||'').replace(/\(.*?\)/g,' ').replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g,c=>({ç:'c',Ç:'C',ğ:'g',Ğ:'G',ı:'i',İ:'I',ö:'o',Ö:'O',ş:'s',Ş:'S',ü:'u',Ü:'U',â:'a',Â:'A',î:'i',Î:'I',û:'u',Û:'U'}[c])).toUpperCase().replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
function akUnvanBol(u){u=akAscii(u);if(u.length<=30)return[u,''];let k=u.lastIndexOf(' ',30);if(k<=0)k=30;return[u.slice(0,k).trim(),u.slice(k).trim()]}
async function akLuca(deneme){const doc=S.aktarim[AK.sec];if(!doc)return;if(!/^\d{6}$/.test(String((S.firmalar[doc.mid]||{}).faaliyetKodu||''))){toast('Önce firmanın 6 haneli faaliyet kodunu girin (Aktarım sekmesi üstünde)');return}if(!doc.onay){toast('Luca aktarım dosyası şef onayından sonra alınabilir');return}if(!S.dl){toast('Bu görünümde dosya indirilemiyor');return}
  const tr=d=>{const [y,m,g]=String(d).split('-');return g&&m&&y?`${g}/${m}/${y}`:d};const r2=n=>Math.round((+n||0)*100)/100;
  const sayi=n=>n===''||n==null?'':r2(n).toFixed(2).replace('.',',');let say=0;const satir=[];
  const kayitT=s=>String(s.tarih).slice(0,7)<(doc.donem||kKey())?tr((doc.donem||kKey())+'-01'):tr(s.tarih);
  for(const s of doc.satirlar){if(s.lucada||s.haric)continue;if(deneme&&say>=3)break;say++;
    const dbBel=LUCA_BELGE[s.belgeTur]||(/ARSIV/i.test(s.senaryo||'')?'e-Arşiv Fatura':/SMM/i.test(s.senaryo||'')?'e-Serbest Meslek Makbuzu':'e-Fatura');
    const sk=s.kalemler.some(k=>String(k.tur)==='2');const [u1,u2]=akUnvanBol(s.unvan);
    const temel={'İŞLEM':'Gider','KATEGORİ':(s.luca||{}).kategori||(sk?'Sabit Kıymet Fişleri':'Defter Fişleri'),'BELGE TÜRÜ':(s.luca||{}).belgeTuru||(sk?'Sabit Kıymet Alış KDV':'Diğer Alışlar'),'EVRAK TARİHİ':tr(s.tarih),'KAYIT TARİHİ':kayitT(s),'EVRAK NO':s.fatura,'TCKN/VKN':s.vkn,'SOYADI ÜNVAN':u1,'ADI DEVAMI':u2,'BELGE TÜRÜ(DB)':dbBel,'ALIŞ/SATIŞ TÜRÜ':'Normal Alım','MAL VE HİZMET KODU':'0','AÇIKLAMA':akAscii(s.unvan).slice(0,100),'MİKTAR':'0','B.FİYAT':'0','TEVKİFAT':'Yok','İŞLEM BEDELİ':'0','MATRAHTAN DÜŞÜLECEK TUTAR':'0','ÖZEL MATRAH ŞEKLİNE DAHİL OLMAYAN BEDEL':'0','FAALIYET KODU':String((S.firmalar[doc.mid]||{}).faaliyetKodu||'')};
    const oran=s.oran==='?'?+((akAyrim(s)||{}).oran||0):+s.oran;
    for(const k of akAnaKalemler(s)){const kdv=k.kdv==null?'':r2(k.kdv);satir.push({...temel,'KAYIT ALT TÜRÜ':k.alt?akAltAd(k.tur,k.alt):'','TUTAR':sayi(k.tutar),'KDV ORANI':String(k.kdv===0&&s.oran==='?'?0:oran),'KDV TUTARI':sayi(kdv),'TOPLAM TUTAR':kdv===''?'':sayi(k.tutar+kdv)})}
    const e=akEk(s);if(e)satir.push({...temel,'KAYIT ALT TÜRÜ':e.alt?akAltAd(e.tur,e.alt):'','AÇIKLAMA':akAscii(s.unvan.slice(0,70)+' '+e.tip),'TUTAR':sayi(e.tutar),'KDV ORANI':'0','KDV TUTARI':'0,00','TOPLAM TUTAR':sayi(e.tutar)})}
  const q=v=>{v=String(v??'');return /[;"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const metin=[LUCA_CSV.map(q).join(';'),...satir.map(r=>LUCA_CSV.map(h=>q(r[h])).join(';'))].join('\r\n')+'\r\n';
  const f=S.firmalar[doc.mid]||{ad:doc.mid};const ad=akAscii(f.ad).split(' ').slice(0,2).join('_');
  try{await S.dl.save({filename:`${ad}_Luca_hizli_fis_${kKey()}${deneme?'_DENEME_3':''}.csv`,data:akCp1254(metin)});toast('Luca CSV dosyası indirildi')}catch(e){if(e&&e.code==='declined')return;toast('Dosya oluşturulamadı')}}
document.addEventListener('change',async e=>{const t=e.target;if(S.tab!=='aktarim')return;
  if(t.id==='aksec'){AK.sec=t.value;render();return}
  if(t.id==='akfk'){const doc0=S.aktarim[AK.sec];const v=t.value.replace(/\D/g,'');if(v&&v.length!==6){toast('Faaliyet kodu 6 haneli olmalı');return}await fSet(doc0.mid,{faaliyetKodu:v});toast('Faaliyet kodu kaydedildi');render();return}
  const doc=S.aktarim[AK.sec];if(!doc||doc.onay)return;
  if(t.dataset.akvo||t.dataset.akvk){const i=+(t.dataset.akvo||t.dataset.akvk);const ss=JSON.parse(JSON.stringify(doc.satirlar));const s=ss[i];
    const box=t.closest('.akv');const oran=box.querySelector('[data-akvo]').value;let kdvS=box.querySelector('[data-akvk]').value.trim();let hes=false;
    if(t.dataset.akvo||kdvS===''){if(s.vergi==null)return;const r=+oran/100;kdvS=String(akR2(r*(s.matrah+s.vergi)/(1+r))).replace('.',',');hes=true}
    const kdv=akR2(kdvS.replace(/\./g,'').replace(',','.'));if(!(kdv>=0)){toast('KDV tutarını sayı olarak girin');return}
    if(s.vergi!=null&&kdv>s.vergi+0.01){toast('KDV, faturadaki vergiler toplamından büyük olamaz');return}
    s.ayrim={oran,kdv,hesap:hes};const ekK=s.kalemler.slice(1).find(k=>!k.kdv);if(ekK){s.ekTur=s.ekTur||ekK.tur;s.ekAlt=s.ekAlt||ekK.alt}s.kalemler=[{...s.kalemler[0],tutar:s.matrah,kdv,manuel:true}];
    await akKaydet({satirlar:ss});await akKuralYaz(s);toast(hes?'KDV, diğer vergiler KDV matrahına dahil varsayımıyla hesaplandı; faturadan teyit edin':'KDV kaydedildi; bu satıcının diğer faturalarına da uygulanır');render();return}
  if(t.dataset.akvt||t.dataset.akvr||t.dataset.akva){const i=+(t.dataset.akvt||t.dataset.akvr||t.dataset.akva);const ss=JSON.parse(JSON.stringify(doc.satirlar));const s=ss[i];const e=akEk(doc.satirlar[i])||{};
    if(t.dataset.akvt){s.ekTip=t.value;const v=AK_EK_VARS[t.value];s.ekTur=e.tur||(v&&v.tur)||'';s.ekAlt=e.alt||(v&&v.alt)||''}
    else if(t.dataset.akvr){s.ekTip=s.ekTip||e.tip||'';s.ekTur=t.value;s.ekAlt=''}else{s.ekTip=s.ekTip||e.tip||'';s.ekTur=s.ekTur||e.tur||'';s.ekAlt=t.value}
    await akKaydet({satirlar:ss});await akKuralYaz(s);render();return}
  if(t.dataset.akt||t.dataset.aka){const [i,j]=(t.dataset.akt||t.dataset.aka).split('.').map(Number);const ss=JSON.parse(JSON.stringify(doc.satirlar));const k=ss[i].kalemler[j];
    if(t.dataset.akt){k.tur=t.value;k.alt=''}else k.alt=t.value;k.manuel=true;await akKaydet({satirlar:ss});render()}});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||S.tab!=='aktarim')return;const d=b.dataset;const doc=S.aktarim[AK.sec];if(!doc)return;
  if(d.aks){const [i,q]=d.aks.split('.').map(Number);const ss=JSON.parse(JSON.stringify(doc.satirlar));ss[i].kalemler=akImza(ss[i],ss[i].secenek[q].imza);await akKaydet({satirlar:ss});render();return}
  if(d.akonay){if(doc.satirlar.some(s=>akDurum(s)==='bos')){toast('Boş satır varken onay verilemez');return}
    const ogren={};for(const s of doc.satirlar)if(s.kalemler.some(k=>k.manuel)){const top=s.kalemler.reduce((a,k)=>a+(+k.tutar||0),0)||1;ogren[s.vkn+'|'+s.oran]=s.kalemler.map(k=>`${k.tur}/${k.alt}:${s.kalemler.length>1?Math.round(k.tutar/top*100)/100:1}${k.kdv||s.kdv==null?'':'*'}`).join('+')}
    await akKaydet({onay:{tarih:today(),kim:(kDoc(doc.mid)||{}).hazirlayan||''},ogrenilen:ogren});toast('Onaylandı; şefin seçimleri şablona eklendi');render();return}
  if(d.akdg||d.akdgg){const i=+(d.akdg||d.akdgg);const ss=JSON.parse(JSON.stringify(doc.satirlar));
    if(d.akdg){const inp=document.querySelector(`[data-akdgt="${i}"]`);const g=(inp&&inp.value||'').trim();if(g.length<5){toast('Gider olarak kalma gerekçesini yazın');return}ss[i].dgGider=g.slice(0,200)}else delete ss[i].dgGider;
    await akKaydet({satirlar:ss});render();return}
  if(d.akgeri){await akKaydet({onay:null});render();return}
  if(d.akxl){akXl();return}
  if(d.akluca){akLuca();return}
  if(d.akluca3){akLuca(true);return}});

// ---------- Fiş fotoğrafı yükleme: ekip yükler, uygulamadaki Claude okur, Aktarım'a satır olarak düşer
const AKF={mid:null,durum:'',calisiyor:false};
const AKF_KAT={yemek:['3','9'],market:['3','9'],kirtasiye:['3','32'],kargo:['3','27'],taksi:['3','44']};
function akFisPanel(){const fs=Object.entries(S.firmalar||{}).filter(([,f])=>f.durum!=='Pasif').sort((a,b)=>(a[1].sira||999)-(b[1].sira||999));
  if(!AKF.mid){const d=S.aktarim[AK.sec];AKF.mid=d?d.mid:(fs[0]||[])[0]}
  const ok=!!S.sample;
  return `<div class="panel" style="padding:14px;display:grid;gap:8px;margin-bottom:12px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>Fiş / Z raporu fotoğrafı ekle</b>
      <label class="sm" for="akfmid">Firma</label><select id="akfmid">${fs.map(([id,f])=>`<option value="${id}" ${id===AKF.mid?'selected':''}>${esc(f.ad)}</option>`).join('')}</select>
      <input type="file" id="akfdosya" accept="image/*" multiple ${ok&&!AKF.calisiyor?'':'disabled'}>
      <button class="pri" data-akfoku="1" ${ok&&!AKF.calisiyor?'':'disabled'}>Fotoğrafları oku ve ekle</button></div>
    <div class="muted" style="font-size:12px">${ok?'Bir fotoğrafta birden fazla fiş olabilir. Claude her fişi okur; satıcı, VKN, tarih, fiş no, tutar ve KDV çıkarılır, bulgular işaretlenir ve satırlar bu dönemin Aktarım listesine eklenir. Fotoğraflar saklanmaz; fişlerin aslı dosyada kalır.':'Bu görünümde fotoğraf okunamıyor (claude.ai üzerinde açın).'}</div>
    ${AKF.durum?`<div class="note">${esc(AKF.durum)}</div>`:''}</div>`}
function akfPrompt(f){return `Sen bir Türk mali müşavirlik ofisinde fiş okuyan asistansın. Fotoğraftaki HER bir fişi/faturayı ayrı ayrı oku.
Mükellef: ${f.ad} (TCKN/VKN: ${f.vkn||'bilinmiyor'}).
Yalnızca JSON dizi döndür, açıklama yazma. Her eleman:
{"tur":"okc_fis"|"e_arsiv"|"e_fatura_bilgi"|"avans_bilgi"|"perakende_satis_fisi"|"z_raporu"|"diger",
"unvan":"satıcı ünvanı (fişte yazdığı gibi)","marka":"tabelada/üstte yazan isim veya null","vkn":"satıcı VKN/TCKN yalnız rakam veya null",
"tarih":"YYYY-MM-DD","fis_no":"fiş no veya belge/fatura no","alici_vkn":"fişte müşteri VKN/TCKN yazıyorsa rakamları, yoksa null",
"toplam":sayı,"kdv_toplam":sayı veya null,"kdv_dagilim":[{"oran":sayı,"matrah":sayı,"kdv":sayı}],
"kalemler":[{"ad":"ürün","tutar":sayı,"oran":sayı veya null}],
"kart_son4":"kartın son 4 hanesi veya null","kart_sahibi":"kartta isim yazıyorsa veya null",
"mali_degeri_yok":true/false ("mali değeri yoktur" yazıyorsa true),"kdv_ayri_gosterilmis":true/false,
"kategori":"yemek"|"market"|"akaryakit"|"otopark"|"kirtasiye"|"kargo"|"taksi"|"hediye"|"elektronik"|"giyim"|"spor"|"hizmet"|"diger",
"okunamayan":["okunamayan alan adları"],"guven":"yuksek"|"orta"|"dusuk"}
Tutarlar Türk biçimindeyse (1.344,00) sayıya çevir (1344.00). Tarihi fişteki gibi oku, tahmin etme; okunmuyorsa null yaz ve okunamayan'a ekle.`}
function akfSatirlar(fis,f,donem,dosya,mevcut){const out=[];const lim=AK_DG[String(donem).slice(0,4)]||AK_DG[2026];const r2=n=>Math.round((+n||0)*100)/100;
  const ogr={};for(const d of Object.values(S.aktarim||{}))if(d.mid===f._id&&d.ogrenilen)Object.assign(ogr,d.ogrenilen);
  for(const x of (Array.isArray(fis)?fis:[])){if(!x||x.tur==='z_raporu')continue;
    const vkn=String(x.vkn||'').replace(/\D/g,'');const top=r2(x.toplam);const dag=(x.kdv_dagilim||[]).filter(g=>g&&g.oran!=null);
    const notlar=[];let haric=null;const al=String(x.alici_vkn||'').replace(/\D/g,'');
    if(x.mali_degeri_yok||x.tur==='avans_bilgi'||x.tur==='e_fatura_bilgi'){if(x.tur==='e_fatura_bilgi'||(al&&f.vkn&&al===String(f.vkn)))haric='Bilgi fişi: asıl e-Fatura/e-Arşiv GİB listesinden gelir; fişten girilirse mükerrer olur.';else haric='Mali değeri olmayan belge (avans/bilgi fişi): asıl fatura gelince işlenir.'}
    if(/^1{10,11}$/.test(al))haric='Nihai tüketiciye (11111111111) kesilmiş: mükellefin belgesi değil, gider ve KDV indirimi yapılamaz.';
    else if(x.tur==='e_arsiv'&&al&&f.vkn&&al===String(f.vkn))haric='Mükellef adına e-Arşiv: GİB/Rahat listesinden gelir; fişten girilirse mükerrer olur.';
    else if(al&&f.vkn&&al!==String(f.vkn)&&x.tur==='e_arsiv')notlar.push(`Alıcı VKN/TCKN ${al}, mükellefinkiyle (${f.vkn}) aynı değil.`);
    const ay=String(x.tarih||'').slice(0,7);if(!x.tarih)notlar.push('Tarih okunamadı.');else if(ay<donem)notlar.push(`Önceki aya ait (${x.tarih}): Ekim'de indirilebilir; Evrak Tarihi fiş tarihi, Kayıt Tarihi dönem başı.`);else if(ay>donem)notlar.push(`Sonraki aya ait (${x.tarih}): bu döneme alınmamalı.`);
    if(x.kart_sahibi)notlar.push(`Kart sahibi: ${x.kart_sahibi} — mükellefin harcaması mı, teyit edin.`);
    if(x.kdv_ayri_gosterilmis===false||x.tur==='perakende_satis_fisi')notlar.push('KDV ayrıca gösterilmemiş: KDV indirilemez.');
    if((x.okunamayan||[]).length)notlar.push('Okunamayan: '+x.okunamayan.join(', ')+'.');
    if(x.guven==='dusuk')notlar.push('Fotoğraf net değil; tutarları fişten teyit edin.');
    if(/hediye|spor|giyim|elektronik/.test(x.kategori||''))notlar.push(`Kategori: ${x.kategori} — işle ilgisi ve kime verildiği not edilmeli.`);
    if(/akaryakit|otopark/.test(x.kategori||''))notlar.push('Binek araç gideri olabilir: plaka ve 70/30 kontrol edilmeli.');
    const buyuk=(x.kalemler||[]).filter(k=>(+k.tutar||0)/(1+((+k.oran||0)/100))>lim).map(k=>({ad:String(k.ad||''),miktar:1,tutar:r2(k.tutar),birim:r2((+k.tutar||0)/(1+((+k.oran||0)/100)))}));
    const gruplar=(x.kdv_ayri_gosterilmis===false||!dag.length)?[{oran:x.kdv_ayri_gosterilmis===false?0:'?',matrah:r2(top-(+x.kdv_toplam||0)),kdv:x.kdv_ayri_gosterilmis===false?0:(x.kdv_toplam!=null?r2(x.kdv_toplam):null)}]:dag.map(g=>({oran:+g.oran,matrah:r2(g.matrah!=null?g.matrah:(+g.kdv||0)*100/(+g.oran||1)),kdv:r2(g.kdv)}));
    const no=String(x.fis_no||'').trim();const nz=v=>String(v||'').replace(/^0+/,'').replace(/\s.*$/,'');
    const mukerrer=mevcut.find(m=>String(m.vkn)===vkn&&nz(m.fatura)===nz(no)&&String(m.tarih)===String(x.tarih||''));
    for(const g of gruplar){const imza=ogr[vkn+'|'+g.oran];let kal=[{tur:'',alt:'',tutar:g.matrah,kdv:g.kdv}],durum='bos',ger='';
      if(imza&&!imza.includes('+')){const [t,a]=imza.split(':')[0].split('/');kal=[{tur:t,alt:a,tutar:g.matrah,kdv:g.kdv}];durum='oto';ger='Bu satıcı önceki onaylı aylarda bu türle kaydedilmiş.'}
      else if(AKF_KAT[x.kategori]&&/^69/.test(String(f.faaliyetKodu||''))){const [t,a]=AKF_KAT[x.kategori];kal=[{tur:t,alt:a,tutar:g.matrah,kdv:g.kdv}];durum='kontrol';ger=`Kategori (${x.kategori}) üzerinden önerildi; şef teyit etsin.`}
      out.push({fatura:no||'?',tarih:x.tarih||'',vkn,unvan:String(x.unvan||x.marka||'?')+(x.marka&&x.unvan&&x.marka!==x.unvan?` (${x.marka})`:''),senaryo:x.tur==='e_arsiv'?'e-Arşiv':x.tur==='perakende_satis_fisi'?'Perakende satış fişi':'ÖKC fişi',belgeTur:x.tur==='e_arsiv'?'10':x.tur==='perakende_satis_fisi'?'3':'2',oran:String(g.oran),matrah:g.matrah,kdv:g.kdv,vergi:null,durum:mukerrer?'bos':durum,gerekce:[mukerrer?'MÜKERRER: aynı fiş listede zaten var.':'',haric||'',haric?'':ger,...notlar].filter(Boolean).join(' '),kalemler:kal,secenek:[],kaynak:'fiş fotoğrafı: '+dosya,toplamFis:top,kart:x.kart_son4||null,...(buyuk.length?{buyuk}:{}),...(haric?{haric:haric.split(':')[0]}:{}),...(mukerrer?{haric:'Mükerrer fiş'}:{})})}}
  return out}
document.addEventListener('change',e=>{if(e.target.id==='akfmid'){AKF.mid=e.target.value}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-akfoku]');if(!b||S.tab!=='aktarim')return;
  const inp=document.getElementById('akfdosya');const files=[...(inp&&inp.files||[])];if(!files.length){toast('Önce fotoğrafları seçin');return}
  if(!S.sample){toast('Bu görünümde fotoğraf okunamıyor');return}
  const lim=await S.sample.limits().catch(()=>null);if(!lim||!lim.images){toast('Bu görünümde fotoğraf okunamıyor');return}
  const mid=AKF.mid;const f={...(S.firmalar[mid]||{}),_id:mid};const donem=kKey();const id=donem+'_'+mid;
  AKF.calisiyor=true;const yeni=[];const hata=[];
  for(let i=0;i<files.length;i++){const fl=files[i];AKF.durum=`Claude ${i+1}/${files.length}. fotoğrafı okuyor (${fl.name})… Fotoğraf başına 20-60 saniye sürebilir.`;render();
    if(fl.size>lim.images.maxInputBytes){hata.push(fl.name+' (dosya çok büyük)');continue}
    try{const fis=await S.sample.json(akfPrompt(f),{images:[fl],modelTier:'complex',cache:false});const mevcut=[...((S.aktarim[id]||{}).satirlar||[]),...yeni];yeni.push(...akfSatirlar(fis,f,donem,fl.name,mevcut))}
    catch(err){if(err&&err.code==='not_granted'){hata.push('izin verilmedi');break}hata.push(fl.name+(err&&err.code?' ('+err.code+')':''))}}
  if(yeni.length){const d=S.aktarim[id]||{donem,mid,hedef:'Luca gider (Ser.Mes.Defteri)',kaynak:'Fiş fotoğrafları',olusturma:today(),satirlar:[]};
    const ss=[...(d.satirlar||[]),...yeni].map((r,k)=>({...r,id:k}));const nd={...d,satirlar:ss,onay:null};S.aktarim[id]=nd;try{await setDoc('aktarim/'+id,nd);AK.sec=id}catch(err){}}
  const h=yeni.filter(r=>r.haric).length;
  AKF.durum=`${files.length} fotoğraftan ${yeni.length} satır eklendi${h?` (${h} tanesi "aktarılmaz" olarak işaretlendi)`:''}.${hata.length?' Okunamayan: '+hata.join(', ')+'.':''}${yeni.length?' Mevcut şef onayı varsa kaldırıldı; satırları kontrol edip yeniden onaylayın.':''}`;
  AKF.calisiyor=false;if(inp)inp.value='';render()});
