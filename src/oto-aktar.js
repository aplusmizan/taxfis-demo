// ---------- aktarma şablonu: geçmiş kayıtlardan öğren, yeni faturaya kayıt öner
// DBS (Defter-Beyan) gider kayıtları için. Emin olmadığı satırı boş bırakır.
const AKT_r2=n=>Math.round((+n||0)*100)/100;
// VUK 313: doğrudan gider yazılabilecek tutar (KDV hariç, birim bedel). 2026: 12.000 TL
const AKT_DG={2025:9900,2026:12000};
function aktOgren(gecmis){
  // gecmis: [{vkn,no,tutar,kdv,oran,tur,alt,belgeTur,ad}]
  const belge=new Map();
  for(const x of gecmis){const k=String(x.vkn)+'|'+x.no;(belge.get(k)||belge.set(k,[]).get(k)).push(x)}
  const m={};const bt={};const ad={};
  for(const [k,xs] of belge){const vkn=k.split('|')[0];ad[vkn]=ad[vkn]||xs[0].ad;
    for(const x of xs){bt[vkn]=bt[vkn]||{};bt[vkn][x.belgeTur]=(bt[vkn][x.belgeTur]||0)+1}
    // aynı belge içinde KDV oranına göre grupla; oranı olmayan satırlar (ÖİV vb.) ana orana bağlı ek satır
    const anaOran=String((xs.find(x=>x.oran)||{}).oran||'');
    const byO={};for(const x of xs){const o=x.oran?String(x.oran):anaOran;(byO[o]=byO[o]||[]).push(x)}
    for(const [o,ys] of Object.entries(byO)){const top=ys.filter(y=>y.oran).reduce((a,y)=>a+(+y.tutar||0),0)||ys.reduce((a,y)=>a+(+y.tutar||0),0);if(!top)continue;
      const satirlar=ys.map(y=>({tur:String(y.tur),alt:String(y.alt),pay:Math.round((+y.tutar||0)/top*100)/100,kdvli:!!y.oran})).sort((a,b)=>(a.tur+a.alt).localeCompare(b.tur+b.alt));
      const imza=satirlar.map(s=>s.tur+'/'+s.alt+':'+(satirlar.length>1?s.pay:1)+(s.kdvli?'':'*')).join('+');
      const key=vkn+'|'+o;const e=m[key]=m[key]||{n:0,desen:{}};e.n++;const d=e.desen[imza]=e.desen[imza]||{n:0,satirlar};d.n++}}
  return{m,bt,ad}}
function aktOner(model,faturalar,kodAd,kural){
  // faturalar: [{no,tarih,vkn,unvan,senaryo,gruplar:{oran:{matrah,kdv}}, toplam, kdvBilinmiyor}]
  const out=[];
  for(const f of faturalar){const vkn=String(f.vkn);const btm=model.bt[vkn]||null;
    const belgeTur=btm?Object.entries(btm).sort((a,b)=>b[1]-a[1])[0][0]:'';
    for(const [o,g] of Object.entries(f.gruplar)){
      let e=model.m[vkn+'|'+o];let oranUyum=true;
      if(!e){const alt=Object.keys(model.m).filter(k=>k.startsWith(vkn+'|'));if(alt.length===1){e=model.m[alt[0]];oranUyum=false}}
      const base={fatura:f.no,tarih:f.tarih,vkn,unvan:f.unvan,senaryo:f.senaryo,belgeTur,oran:o,matrah:g.matrah,kdv:g.kdv};if(f.buyuk)base.buyuk=f.buyuk;if(o==='?'&&f.vergi!=null){const kv=Object.entries(f.gruplar).filter(([x])=>x!=='?').reduce((t,[,y])=>t+(y.kdv||0),0);base.vergi=AKT_r2(f.vergi-kv)}
      if(!e){out.push({...base,satirlar:[{tur:'',alt:'',tutar:g.matrah,kdv:g.kdv}],durum:'bos',gerekce:'Yeni satıcı: geçmişte kaydı yok. Kayıt türünü şef seçecek.',secenek:[]});continue}
      const ds=Object.entries(e.desen).sort((a,b)=>b[1].n-a[1].n);const [imza,top]=ds[0];const oranPay=top.n/e.n;
      const secenek=ds.slice(0,4).map(([i,d])=>({imza:i,n:d.n,ad:d.satirlar.map(s=>(kodAd[s.tur+'/'+s.alt]||s.tur+'/'+s.alt)+(d.satirlar.length>1?' %'+Math.round(s.pay*100):'')).join(' + ')}));
      const kur=d=>{const kdvliPay=d.satirlar.filter(s=>s.kdvli).reduce((a,s)=>a+s.pay,0)||1;return d.satirlar.map(s=>({tur:s.tur,alt:s.alt,tutar:AKT_r2(g.matrah*s.pay),kdv:g.kdv==null?null:s.kdvli?AKT_r2(g.kdv*s.pay/kdvliPay):0}))};
      let durum,gerekce,satirlar;
      if(e.n>=2&&oranPay>=0.9&&oranUyum&&!f.kdvBilinmiyor){durum='oto';satirlar=kur(top);gerekce=`Geçmişte ${e.n} belgenin ${top.n} tanesi bu şekilde kaydedilmiş.`}
      else if((e.n===1||oranPay>=0.6)&&ds.length<=2){durum='kontrol';satirlar=kur(top);gerekce=f.kdvBilinmiyor?'KDV satır bazında gelmedi (ÖİV/fon olabilir); tutarları faturadan teyit edin.':!oranUyum?`Bu satıcının bu KDV oranında geçmiş kaydı yok; başka orandaki kayda göre önerildi.`:e.n===1?'Satıcının geçmişte tek kaydı var; öneri teyit edilmeli.':`Geçmişte ${e.n} belgenin ${top.n} tanesi bu şekilde; diğerleri farklı.`}
      else{durum='bos';satirlar=[{tur:'',alt:'',tutar:g.matrah,kdv:g.kdv}];gerekce=`Satıcı geçmişte farklı türlerle kaydedilmiş (${ds.length} farklı şekil); şef seçecek.`}
      if(f.kdvBilinmiyor&&durum==='oto')durum='kontrol';
      if(o==='?'&&kural&&kural[vkn]&&f.vergi!=null){const r=kural[vkn];const kv=Object.entries(f.gruplar).filter(([x])=>x!=='?').reduce((t,[,y])=>t+(y.kdv||0),0);const vergi=AKT_r2(f.vergi-kv);
        const kdv=AKT_r2(g.matrah*r.kdvPay);const ek=AKT_r2(vergi-kdv);base.vergi=vergi;
        if(Math.abs(ek/(g.matrah||1)-r.ekPay)<=0.01&&satirlar[0]&&satirlar[0].tur){satirlar=satirlar.map(k=>({...k,kdv}));durum='oto';gerekce=`KDV/${r.tip} ayrımı ${r.fatura} faturasındaki şef ayrımına göre hesaplandı.`}}
      else if(o==='?'&&f.vergi!=null){const kv=Object.entries(f.gruplar).filter(([x])=>x!=='?').reduce((t,[,y])=>t+(y.kdv||0),0);base.vergi=AKT_r2(f.vergi-kv)}
      const AKT_HZ=/bak[ıi]m|onar[ıi]m|tamir|servis|i[şs][çc]ilik|hizmet|montaj|kurulum|kira|dan[ıi][şs]man|abonelik|reklam|kargo|nakliye|e[ğg]itim|yenileme|revizyon|tadilat/i;
      if(base.buyuk&&base.buyuk.some(b=>!AKT_HZ.test(b.ad))&&!satirlar.some(k=>['2','13'].includes(String(k.tur)))){satirlar=[{tur:'2',alt:'',tutar:g.matrah,kdv:g.kdv}];durum='bos';gerekce=`Doğrudan gider sınırını aşan kalem (${base.buyuk.map(b=>b.ad).join(', ')}): mal niteliğinde, demirbaş olarak önerildi; şef alt türü seçecek ya da gerekçeyle gider bırakacak.`}
      out.push({...base,satirlar,durum,gerekce,secenek})}}
  return out}
function rahatFaturalar(rows,yon){
  // Rahat Aktarım satır bazlı liste -> fatura/oran grupları
  const by=new Map();
  for(const x of rows){if(yon&&x['Fatura Yönü']!==yon)continue;const no=x['Fatura Numarası'];const f=by.get(no)||{no,tarih:String(x['Fatura Tarihi']).slice(0,10),vkn:String(x[yon==='Giden'?'Alıcı VKN':'Gönderici VKN']).replace(/\D/g,'').replace(/^0+/,''),unvan:x[yon==='Giden'?'Alıcı Ünvan':'Gönderici Ünvan'],senaryo:x['Fatura Senaryosu'],tip:x['Fatura Tipi'],gruplar:{},mal:+x['Mal Hizmet Toplamı']||0,vergi:+x['Vergiler Toplamı']||0,toplam:+x['Toplam Tutar']||0,kdvBilinmiyor:false};
    const o=x['KDV Oranı']===''||x['KDV Oranı']==null?'':String(Math.round(+x['KDV Oranı']));
    {const q=+x['Miktar']||1;const t=+x['Tutar']||0;const lim=AKT_DG[String(f.tarih).slice(0,4)]||AKT_DG[2026];if(t/q>lim){(f.buyuk=f.buyuk||[]).push({ad:String(x['Ürün Adı']||''),miktar:q,tutar:AKT_r2(t),birim:AKT_r2(t/q)})}}
    if(o===''){f.kdvBilinmiyor=true}else{const g=f.gruplar[o]=f.gruplar[o]||{matrah:0,kdv:0};g.matrah=AKT_r2(g.matrah+(+x['Tutar']||0));g.kdv=AKT_r2(g.kdv+(+x['KDV Tutarı']||0))}
    by.set(no,f)}
  for(const f of by.values()){if(f.kdvBilinmiyor){const t=Object.values(f.gruplar).reduce((a,g)=>a+g.matrah,0);const kalan=AKT_r2(f.mal-t);if(Math.abs(kalan)>=0.01){f.gruplar['?']={matrah:kalan,kdv:null}}}
    // tarih UTC → yerel
    if(/T/.test(f.tarih)){}}
  return [...by.values()]}
if(typeof module!=='undefined')module.exports={aktOgren,aktOner,rahatFaturalar,AKT_DG};
