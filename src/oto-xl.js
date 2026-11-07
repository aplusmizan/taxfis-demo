// ---------- Excel çıktısı (yazdırmaya hazır kontrol tablosu)
async function excelOlustur(firma,donem,k){const EJ=window.ExcelJS;if(!EJ)throw new Error('Excel kütüphanesi yüklenemedi');
  const wb=new EJ.Workbook();const NF='#,##0.00;-#,##0.00;"-"';const ar=(o={})=>({name:'Arial',size:9,...o});
  const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}});const ince={style:'thin',color:{argb:'FFBFBFBF'}};const kenar={top:ince,left:ince,bottom:ince,right:ince};
  const ws=wb.addWorksheet('Kontrol',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:0.3,right:0.3,top:0.4,bottom:0.4,header:0.2,footer:0.2}},headerFooter:{oddFooter:'&L'+firma+' · '+donem+' KDV-1 kontrolü&RSayfa &P / &N'}});
  [14,44,4,15,15,15,15,13,11,9,13,11,9,14,13].forEach((w,i)=>ws.getColumn(i+1).width=w);
  const t=(r,c,v,o={})=>{const x=ws.getCell(r,c);x.value=v;x.font=ar(o.font||{});if(o.nf)x.numFmt=o.nf;if(o.fill)x.fill=fill(o.fill);if(o.b)x.border=kenar;if(o.al)x.alignment=o.al;return x};
  t(1,1,'KDV-1 KONTROL TABLOSU',{font:{bold:true,size:12}});t(2,1,firma,{font:{bold:true,size:11}});
  t(3,1,'Dönem :',{font:{bold:true}});t(3,2,donem);t(4,1,'Kontrol tarihi :',{font:{bold:true}});t(4,2,trDate(k.kontrolTarihi||today()));
  if(k.hazirlayan){t(4,4,'Hazırlayan :',{font:{bold:true}});t(4,5,k.hazirlayan)}
  const H=['HESAP KODU','HESAP ADI','','BORÇ','ALACAK','BORÇ BAKİYESİ','ALACAK BAKİYESİ','e-fatura','e-smm','fiş','e-arşiv','tevkifat','gider pusulası','toplam','fark'];
  H.forEach((h,i)=>t(6,i+1,h,{font:{bold:true},fill:'FFD9D9D9',b:1,al:{horizontal:'center'}}));
  let R=6;const KOL=['e-fatura','e-smm','fis','e-arsiv','tevkifat','gider'];
  for(const s of k.tablo||[]){R++;const fb={bold:!s.leaf};
    t(R,1,s.kod,{font:fb,b:1});t(R,2,s.ad,{font:fb,b:1});t(R,3,s.leaf?'TL':'',{b:1});
    [s.b,s.a,s.bb,s.ab].forEach((v,i)=>t(R,4+i,v||null,{font:fb,nf:NF,b:1}));
    KOL.forEach((c,i)=>t(R,8+i,s.src&&s.src[c]?s.src[c]:null,{nf:NF,b:1,font:{color:{argb:'FF0000FF'}}}));
    if(s.leaf){t(R,14,{formula:`SUM(H${R}:M${R})`,result:s.toplam},{nf:NF,b:1});const fk=t(R,15,{formula:`N${R}-F${R}-G${R}`,result:s.fark},{nf:NF,b:1,font:{bold:Math.abs(s.fark)>=1}});
      if(Object.values(s.src||{}).some(Boolean)&&Math.abs(s.fark)>=5)fk.fill=fill('FFF8DCD8')}
    else{t(R,14,null,{b:1});t(R,15,null,{b:1})}}
  R+=1;t(R,1,'Mavi rakamlar kaynak dosyalardan alınmıştır: e-fatura ve e-arşiv = KDV ayrım raporu / GİB listeleri, e-smm = e-SMM listesi, tevkifat = ayrım raporu tevkifat sütunları. fark = toplam − bakiye.',{font:{italic:true,color:{argb:'FF595959'}}});
  R+=2;t(R,1,'BEYANNAME KARŞILAŞTIRMASI',{font:{bold:true,size:10}});R++;
  ['Kalem','','','Beyanname','Kayıt (mizan/defter)','GİB kaynakları','Fark (Beyan−Mizan)','Durum'].forEach((h,i)=>t(R,i+1,h,{font:{bold:true},fill:'FFD9D9D9',b:1}));
  for(const x of k.kars||[]){R++;t(R,1,x.ad,{b:1});ws.mergeCells(R,1,R,3);t(R,4,x.beyan,{nf:NF,b:1});t(R,5,x.mizan,{nf:NF,b:1});t(R,6,x.gib,{nf:NF,b:1});
    t(R,7,x.fark==null?null:{formula:`D${R}-E${R}`,result:x.fark},{nf:NF,b:1});const d=t(R,8,x.durum,{b:1});ws.mergeCells(R,8,R,11);
    if(/^Fark var/.test(x.durum))d.fill=fill('FFF8DCD8');else if(/Doğrulanamadı|girilmedi|Yuvarlama/.test(x.durum))d.fill=fill('FFFFF2CC');else if(/Tutarlı/.test(x.durum))d.fill=fill('FFDCF0E2')}
  const blok=(baslik,satirlar,dolgu)=>{R+=2;for(let c=1;c<=15;c++)ws.getCell(R,c).fill=fill('FF2E3175');t(R,1,baslik,{font:{bold:true,size:10,color:{argb:'FFFFFFFF'}},fill:'FF2E3175'});
    for(const s of satirlar){R++;ws.mergeCells(R,1,R,15);t(R,1,s,{al:{wrapText:true,vertical:'top'},fill:dolgu});ws.getRow(R).height=Math.max(15,13*Math.ceil(s.length/190))}};
  const bl=(k.bulgular||[]).map(b=>`${b.seviye==='kirmizi'?'KIRMIZI':'SARI'}${b.duzeltildi?' (düzeltildi)':''} · ${b.kategori}: ${b.aciklama}${b.oneri?' Yapılacak: '+b.oneri:''}`);
  if(bl.length)blok('BULGULAR',bl,'FFFDF5E6');
  blok('KRİTİK NOTLAR',(k.notlar||[]).map((s,i)=>`${i+1}. ${s}`),null);
  blok('SONUÇ',[k.sonuc||''],(k.bulgular||[]).some(b=>b.seviye==='kirmizi'&&!b.duzeltildi)?'FFF8DCD8':/^Kontrol eksik/.test(k.sonuc||'')?'FFFFF2CC':'FFDCF0E2');
  R+=2;t(R,1,'Kontrol eden:',{font:{bold:true}});t(R,5,'Onaylayan (şef):',{font:{bold:true}});t(R,10,'Tarih:',{font:{bold:true}});
  ws.views=[{state:'frozen',ySplit:6,xSplit:2}];ws.pageSetup.printTitlesRow='6:6';
  if((k.tevkifat||[]).length){const w2=wb.addWorksheet('Tevkifat',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
    [20,44,18,16,14,9,15,13,40].forEach((w,i)=>w2.getColumn(i+1).width=w);const c=(r,cc,v,o={})=>{const x=w2.getCell(r,cc);x.value=v;x.font=ar(o.font||{});if(o.nf)x.numFmt=o.nf;if(o.fill)x.fill=fill(o.fill);if(o.b)x.border=kenar;return x};
    c(1,1,`${firma} · ${donem} · Tevkifat ve sorumlu sıfatıyla KDV`,{font:{bold:true,size:11}});
    const T=k.tevkifat,yi=T.filter(s=>!/^Yurt dışı/.test(s.tur)),yd=T.filter(s=>/^Yurt dışı/.test(s.tur));let R=2;const ref={};
    if(yi.length){R+=1;c(R,1,'YURTİÇİ TEVKİFATLI ALIMLAR',{font:{bold:true,color:{argb:'FFFFFFFF'}},fill:'FF2E3175'});for(let i=2;i<=9;i++)w2.getCell(R,i).fill=fill('FF2E3175');R++;
      ['Belge no','Karşı taraf','Satıcıya ödenen KDV','Tevkif (KDV-2)','Toplam KDV','Oran','GİB toplam KDV','GİB tevkif','Durum'].forEach((h,i)=>c(R,i+1,h,{font:{bold:true},fill:'FFD9D9D9',b:1}));const s0=R+1;
      for(const s of yi){R++;[s.no,s.karsi,s.satici,s.tev,{formula:`C${R}+D${R}`,result:s.toplam},s.oran+(s.gibOran&&s.gibOran!==s.oran?` (GİB ${s.gibOran})`:''),s.gibKdv,s.gibTev,s.durum].forEach((v,i)=>c(R,i+1,v,{b:1,nf:[2,3,4,6,7].includes(i)?NF:undefined}))}
      R++;c(R,1,`Yurtiçi toplam (${yi.length} belge)`,{font:{bold:true},b:1});c(R,2,'',{b:1});['C','D','E','G','H'].forEach(L=>{const x=w2.getCell(`${L}${R}`);x.value={formula:`SUM(${L}${s0}:${L}${R-1})`};x.numFmt=NF;x.font=ar({bold:true});x.border=kenar});ref.yi=R;R++}
    if(yd.length){R+=1;c(R,1,"YURT DIŞINDAN ALINAN HİZMETLER (KDV'nin tamamı sorumlu sıfatıyla)",{font:{bold:true,color:{argb:'FFFFFFFF'}},fill:'FF2E3175'});for(let i=2;i<=9;i++)w2.getCell(R,i).fill=fill('FF2E3175');R++;
      ['Belge no','Karşı taraf','','Sorumlu KDV (KDV-2)','','','','','Durum'].forEach((h,i)=>c(R,i+1,h,{font:{bold:true},fill:'FFD9D9D9',b:1}));const s0=R+1;
      for(const s of yd){R++;c(R,1,s.no,{b:1});c(R,2,s.karsi,{b:1});c(R,4,s.tev,{b:1,nf:NF});c(R,9,s.durum,{b:1})}
      R++;c(R,1,`Yurt dışı toplam (${yd.length} belge)`,{font:{bold:true},b:1});const x=w2.getCell(`D${R}`);x.value={formula:`SUM(D${s0}:D${R-1})`};x.numFmt=NF;x.font=ar({bold:true});x.border=kenar;ref.yd=R;R++}
    const o=k.tevOzet||{};R+=1;c(R,1,'GENEL TOPLAM (NET)',{font:{bold:true,color:{argb:'FFFFFFFF'}},fill:'FF2E3175'});for(let i=2;i<=9;i++)w2.getCell(R,i).fill=fill('FF2E3175');R++;
    ['Kalem','','','Tutar','Fark (− belgeler)','','','','Durum'].forEach((h,i)=>c(R,i+1,h,{font:{bold:true},fill:'FFD9D9D9',b:1}));
    R++;c(R,1,'Yurtiçi tevkifat (KDV-2)',{b:1});c(R,4,ref.yi?{formula:`D${ref.yi}`}:0,{b:1,nf:NF});const ry=R;
    R++;c(R,1,'Yurt dışı hizmet sorumlu KDV',{b:1});c(R,4,ref.yd?{formula:`D${ref.yd}`}:0,{b:1,nf:NF});
    R++;const rt=R;c(R,1,'Toplam sorumlu sıfatıyla KDV (belgelerden)',{font:{bold:true},b:1});c(R,4,{formula:`D${ry}+D${ry+1}`},{font:{bold:true},b:1,nf:NF});
    for(const [ad,v] of [['Mizan · 191 sorumlu sıfatıyla hesabı',o.m109],['Mizan · 360 KDV-2 tahakkuku',o.m360],['KDV-1 beyanı · sorumlu sıfatıyla ödenen KDV',o.beyan]]){if(v==null)continue;R++;c(R,1,ad,{b:1});c(R,4,v,{b:1,nf:NF});c(R,5,{formula:`D${R}-D${rt}`},{b:1,nf:NF});c(R,9,{formula:`IF(ABS(E${R})<0.01,"Tutarlı",IF(ABS(E${R})<5,"Kuruş farkı","Fark var"))`},{b:1})}
    if(yi.length){R++;c(R,1,'Yurtiçi alımlarda satıcıya ödenen KDV',{b:1});c(R,4,{formula:`C${ref.yi}`},{b:1,nf:NF});R++;c(R,1,"Tevkifatlı alımların toplam KDV'si (satıcı + tevkif)",{font:{bold:true},b:1});c(R,4,{formula:`E${ref.yi}`},{font:{bold:true},b:1,nf:NF})}}
  return wb.xlsx.writeBuffer()}
