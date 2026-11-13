const $=s=>document.querySelector(s),C=window.KTGS_CONFIG;
const GROUPS=["Trung ương","Thành phố","Phường"],PERIODS=["Năm","Quý","Tháng"],STATUS=["Chưa thực hiện","Đang thực hiện","Hoàn thành","Tạm dừng"];
let code=sessionStorage.getItem("ktgs_code")||"",admin=false,data={documents:[],tasks:[]},page="home",dgroup="",tperiod="",ed=null,openDocId="";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
function toast(s){const t=$("#toast");t.textContent=s;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",3500)}
async function api(action,payload={}){
 const ms=(action==="getData"?30:90)*1000,ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),ms);
 try{
  const r=await fetch((C&&C.API)||"/proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,code,...payload}),signal:ctrl.signal});
  let j;try{j=await r.json()}catch{throw Error("Máy chủ trả về dữ liệu không hợp lệ (mã "+r.status+").")}
  if(!j.ok)throw Error(j.error||"Có lỗi xảy ra");
  return j.data;
 }catch(e){if(e.name==="AbortError")throw Error("Máy chủ không phản hồi sau "+ms/1000+" giây.");throw e}
 finally{clearTimeout(tm)}}
async function load(){let err=null;try{const r=await api("getData");data=r;admin=!!r.isAdmin;if(!admin&&code){code="";sessionStorage.removeItem("ktgs_code")}localStorage.setItem("ktgs_cache",JSON.stringify({documents:r.documents||[],tasks:r.tasks||[]}));$("#offline").classList.add("hidden")}
 catch(e){err=e;try{const c=JSON.parse(localStorage.getItem("ktgs_cache"));if(c){data=c;admin=false;$("#offline").classList.remove("hidden")}}catch{}toast(e.message)}
 render();return err}
$("#adminbtn").onclick=()=>{if(admin){code="";admin=false;sessionStorage.removeItem("ktgs_code");return load()}
 modal("Đăng nhập quản trị",`<form id="lf"><div class="field"><label>Mật khẩu quản trị</label><input id="pw" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" autofocus></div><p id="lerr" class="muted"></p><div class="row"><button class="btn" id="lgo">Đăng nhập</button><button type="button" class="btn light" onclick="closeM2()">Hủy</button></div></form>`);
 $("#lf").onsubmit=async e=>{e.preventDefault();const c=$("#pw").value.trim();if(!c)return;code=c;$("#lgo").disabled=true;$("#lgo").textContent="Đang kiểm tra...";
  const er=await load();if(er){code="";$("#lerr").textContent="Không kết nối được máy chủ: "+er.message+" — kiểm tra biến GAS_URL/PROXY_KEY trên Cloudflare và việc triển khai lại Code.gs.";}
  else if(admin){sessionStorage.setItem("ktgs_code",code);closeM();toast("Đã vào chế độ quản trị")}
  else{code="";$("#lerr").textContent="Mật khẩu không đúng."}
  const g=$("#lgo");if(g){g.disabled=false;g.textContent="Đăng nhập"}}};
const fmt=d=>d?d.split("-").reverse().join("/"):"";
const days=d=>d?Math.ceil((new Date(d)-new Date(new Date().toDateString()))/864e5):null;
const PAGE=20,byDate=(a,b)=>String(b.date||b.created||"").localeCompare(String(a.date||a.created||""));
let dlimit=PAGE,slimit=PAGE;
function docItem(d){const o=openDocId===d.id,meta=[d.group&&d.group!=="Nghiệp vụ"?d.group:"",d.code,fmt(d.date)].filter(Boolean).join(" · ");
 return `<article class="doc-accordion ${o?"opened":""}">
<button class="doc-heading" type="button" onclick="toggleDoc('${d.id}')" aria-expanded="${o}">
<span class="doc-main"><span class="doc-title">${esc(d.title||"Chưa đặt tên tài liệu")}</span>${meta?`<span class="doc-meta">${esc(meta)}</span>`:""}</span><span class="doc-arrow">${o?"−":"＋"}</span>
</button>
${o?`<div class="doc-detail">
${d.summary?`<p>${esc(d.summary)}</p>`:""}
<div class="row"><button class="btn" onclick="view('${d.id}')">👁 Xem PDF</button><a class="btn light" href="https://drive.google.com/uc?export=download&id=${esc(d.fileId)}" target="_blank" rel="noopener">⬇ Tải về</a>
${admin?`<button class="btn light" onclick="form('doc','${d.id}')">Sửa</button><button class="btn red" onclick="del('documents','${d.id}')">Xóa</button>`:""}</div>
</div>`:""}</article>`}
function listHtml(a,lim,key,empty){if(!a.length)return `<p class="empty">${empty}</p>`;
 return `<p class="count">Hiển thị ${Math.min(lim,a.length)} / ${a.length} tài liệu</p>`+a.slice(0,lim).map(docItem).join("")+(a.length>lim?`<button class="btn light more" onclick="more('${key}')">Xem thêm ${Math.min(PAGE,a.length-lim)} tài liệu</button>`:"")}
window.more=k=>{if(k==="d")dlimit+=PAGE;else slimit+=PAGE;render()};

function taskItem(t){const n=days(t.deadline),done=t.status==="Hoàn thành";
 const due=done||n==null?"":n<0?`<span class="tag bad">Quá hạn ${-n} ngày</span>`:n<=7?`<span class="tag warn">Còn ${n} ngày</span>`:"";
 return `<article class="item"><h3>${esc(t.title)}</h3><p>${esc(t.description||"")}</p><p>${t.unit?"👤 "+esc(t.unit)+" · ":""}${t.deadline?"📅 hạn "+fmt(t.deadline):""}</p>
<div class="row"><span class="tag">${esc(t.period)}${t.time?" · "+esc(t.time):""}</span><span class="tag ${done?"ok":""}">${esc(t.status)}</span>${due}
${admin?`<button class="btn light" onclick="form('task','${t.id}')">Sửa</button><button class="btn red" onclick="del('tasks','${t.id}')">Xóa</button>`:""}</div></article>`}
const match=(d,q)=>!q||norm([d.title,d.code,d.summary].join(" ")).includes(norm(q));
const chips=(el,opts,cur,fn)=>{$(el).innerHTML=["Tất cả",...opts].map(o=>`<button class="chip ${(o==="Tất cả"?"":o)===cur?"on":""}" data-v="${o==="Tất cả"?"":o}">${o}</button>`).join("");$(el).querySelectorAll(".chip").forEach(b=>b.onclick=()=>fn(b.dataset.v))};
window.toggleDoc=id=>{openDocId=openDocId===id?"":id;render()};
function render(){const D=data.documents||[],T=data.tasks||[];document.querySelectorAll(".adm").forEach(x=>x.classList.toggle("hidden",!admin));
 $("#adminbtn").textContent=admin?"🔓 Thoát quản trị":"🔑 Quản trị";
 const open=T.filter(t=>t.status!=="Hoàn thành").sort((a,b)=>(a.deadline||"9").localeCompare(b.deadline||"9")).slice(0,5);
 chips("#docchips",GROUPS,dgroup,v=>{dgroup=v;dlimit=PAGE;render()});
 $("#doclist").innerHTML=listHtml(D.filter(d=>d.group!=="Nghiệp vụ"&&(!dgroup||d.group===dgroup)&&match(d,$("#q").value)).sort(byDate),dlimit,"d","Không có tài liệu phù hợp.");
 $("#skilllist").innerHTML=listHtml(D.filter(d=>d.group==="Nghiệp vụ"&&match(d,$("#q2").value)).sort(byDate),slimit,"s","Chưa có hướng dẫn nghiệp vụ.");
 chips("#taskchips",PERIODS,tperiod,v=>{tperiod=v;render()});
 $("#tasklist").innerHTML=T.filter(t=>!tperiod||t.period===tperiod).sort((a,b)=>(a.deadline||"9").localeCompare(b.deadline||"9")).map(taskItem).join("")||'<p class="empty">Chưa có nhiệm vụ.</p>'}
$("#q").oninput=()=>{dlimit=PAGE;render()};$("#q2").oninput=()=>{slimit=PAGE;render()};
function goPage(next){page=next;document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));$("#p-"+page).classList.remove("hidden");document.querySelectorAll(".bar button").forEach(x=>x.classList.toggle("on",x.dataset.p===page));scrollTo(0,0)}
document.querySelectorAll(".bar button").forEach(b=>b.onclick=()=>goPage(b.dataset.p));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>goPage(b.dataset.go));
const modal=(t,h,big)=>{$("#mt").textContent=t;$("#mb").innerHTML=h;$(".dialog").classList.toggle("big",!!big);$("#modal").classList.remove("hidden")};
const closeM=()=>{$("#modal").classList.add("hidden");$("#mb").innerHTML=""};$("#mx").onclick=closeM;
let activePdf=null,pdfPage=1,pdfZoom=1,pdfTask=null,pdfToken=0,pdfCache={id:"",bytes:null};
const clampZ=z=>Math.max(1,Math.min(4,z));
async function drawPdfPage(dir=0){
 const canvas=$("#pdfCanvas"),stage=$("#pdfStage"),paper=$("#pdfPaper");if(!activePdf||!canvas||!stage)return;
 const token=++pdfToken;if(pdfTask){try{pdfTask.cancel()}catch(e){}}
 const pg=await activePdf.getPage(pdfPage);if(token!==pdfToken)return;
 // Vừa khít cả chiều rộng lẫn chiều cao màn hình → thấy toàn trang
 const base=pg.getViewport({scale:1}),fit=Math.min((stage.clientWidth-16)/base.width,(stage.clientHeight-16)/base.height);
 const vp=pg.getViewport({scale:Math.max(.1,fit)*pdfZoom});
 const dpr=Math.max(.5,Math.min(window.devicePixelRatio||1,2,Math.sqrt(16e6/(vp.width*vp.height))));
 const off=document.createElement("canvas");off.width=Math.floor(vp.width*dpr);off.height=Math.floor(vp.height*dpr);
 pdfTask=pg.render({canvasContext:off.getContext("2d"),viewport:vp,transform:[dpr,0,0,dpr,0,0]});
 try{await pdfTask.promise}catch(e){if(e&&e.name==="RenderingCancelledException")return;throw e}
 if(token!==pdfToken)return;
 canvas.width=off.width;canvas.height=off.height;canvas.style.width=vp.width+"px";canvas.style.height=vp.height+"px";canvas.getContext("2d").drawImage(off,0,0);
 paper.classList.remove("hidden","in-r","in-l");if(dir){void paper.offsetWidth;paper.classList.add(dir>0?"in-r":"in-l")}
 $("#pdfPageLabel").textContent=`Trang ${pdfPage} / ${activePdf.numPages}`;
 $("#pdfPrev").disabled=pdfPage<=1;$("#pdfNext").disabled=pdfPage>=activePdf.numPages;
}
function pdfGo(d){if(!activePdf)return;const n=pdfPage+d;if(n<1||n>activePdf.numPages)return;pdfPage=n;const s=$("#pdfStage");if(s)s.scrollTo(0,0);drawPdfPage(d).catch(console.error)}
function pdfSetZoom(z){const s=$("#pdfStage");z=clampZ(z);if(!s||!activePdf||Math.abs(z-pdfZoom)<.01)return;
 const cx=(s.scrollLeft+s.clientWidth/2)/s.scrollWidth,cy=(s.scrollTop+s.clientHeight/2)/s.scrollHeight;
 pdfZoom=z;s.classList.toggle("zoomed",z>1.02);
 drawPdfPage(0).then(()=>{s.scrollLeft=cx*s.scrollWidth-s.clientWidth/2;s.scrollTop=cy*s.scrollHeight-s.clientHeight/2}).catch(console.error)}
function closePv(){const el=$("#pv");if(el)el.remove();pdfToken++;if(pdfTask){try{pdfTask.cancel()}catch(e){}}if(activePdf){try{activePdf.destroy()}catch(e){}activePdf=null}
 document.body.classList.remove("noscroll");document.removeEventListener("keydown",pvKey);window.onresize=null}
function pvKey(e){if(e.key==="ArrowRight"||e.key==="PageDown")pdfGo(1);else if(e.key==="ArrowLeft"||e.key==="PageUp")pdfGo(-1);else if(e.key==="Escape")pvClose()}
function pvClose(){if(history.state&&history.state.pv)history.back();else closePv()}
addEventListener("popstate",closePv);
// Cử chỉ cảm ứng: vuốt trái/phải = chuyển trang, kẹp 2 ngón = thu phóng, chạm đúp = phóng to/vừa trang
function pdfGestures(stage){let t0=null,pinch=null,lastTap=0;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 stage.addEventListener("touchstart",e=>{if(e.touches.length===2){pinch={d:dist(e.touches),z:pdfZoom,live:pdfZoom};t0=null}else if(e.touches.length===1&&!pinch){const t=e.touches[0];t0={x:t.clientX,y:t.clientY,t:Date.now()}}},{passive:true});
 stage.addEventListener("touchmove",e=>{if(pinch&&e.touches.length===2){e.preventDefault();pinch.live=clampZ(pinch.z*dist(e.touches)/pinch.d);const p=$("#pdfPaper");if(p)p.style.transform=`scale(${pinch.live/pdfZoom})`}},{passive:false});
 stage.addEventListener("touchend",e=>{
  if(pinch){if(e.touches.length<2){const z=pinch.live;pinch=null;const p=$("#pdfPaper");if(p)p.style.transform="";pdfSetZoom(z)}return}
  if(!t0||!activePdf)return;const t=e.changedTouches[0],dx=t.clientX-t0.x,dy=t.clientY-t0.y,dt=Date.now()-t0.t;t0=null;
  if(pdfZoom<=1.02&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4&&dt<700){pdfGo(dx<0?1:-1);lastTap=0}
  else if(Math.abs(dx)<10&&Math.abs(dy)<10&&dt<300){const n=Date.now();if(n-lastTap<320){pdfSetZoom(pdfZoom>1.02?1:2.5);lastTap=0}else lastTap=n}
 },{passive:true});
 stage.addEventListener("touchcancel",()=>{t0=null;pinch=null;const p=$("#pdfPaper");if(p)p.style.transform=""},{passive:true})}
window.view=async id=>{
 const d=data.documents.find(x=>x.id===id);if(!d||!d.fileId)return toast("Không tìm thấy file PDF.");
 closePv();pdfPage=1;pdfZoom=1;
 const download=`https://drive.google.com/uc?export=download&id=${encodeURIComponent(d.fileId)}`;
 const el=document.createElement("div");el.id="pv";el.className="pv";
 el.innerHTML=`<div class="pv-top"><b class="pv-title">${esc(d.title)}</b><a class="pv-dl" href="${download}" target="_blank" rel="noopener" title="Tải về">⬇ Tải</a><button id="pvx" class="x" title="Đóng">✕ Đóng</button></div>
<div id="pdfStage" class="pv-stage"><div id="pdfPaper" class="pv-paper hidden"><canvas id="pdfCanvas"></canvas></div><div id="pdfStatus" class="pv-status">Đang lấy tài liệu từ kho lưu trữ...</div></div>
<div class="pv-bar"><button id="pdfPrev" disabled title="Trang trước">‹</button><button id="pdfPageLabel" class="pv-label" title="Đến trang...">Đang tải...</button><button id="pdfNext" disabled title="Trang sau">›</button><span class="pv-sep"></span><button id="pdfZoomOut" title="Thu nhỏ">−</button><button id="pdfFit" title="Vừa trang">⤢</button><button id="pdfZoomIn" title="Phóng to">＋</button></div>`;
 document.body.appendChild(el);document.body.classList.add("noscroll");history.pushState({pv:1},"");
 $("#pvx").onclick=pvClose;document.addEventListener("keydown",pvKey);
 $("#pdfPrev").onclick=()=>pdfGo(-1);$("#pdfNext").onclick=()=>pdfGo(1);
 $("#pdfZoomOut").onclick=()=>pdfSetZoom(pdfZoom-.5);$("#pdfZoomIn").onclick=()=>pdfSetZoom(pdfZoom+.5);$("#pdfFit").onclick=()=>pdfSetZoom(1);
 $("#pdfPageLabel").onclick=()=>{if(!activePdf)return;const n=parseInt(prompt(`Đến trang (1–${activePdf.numPages}):`,pdfPage),10);if(n>=1&&n<=activePdf.numPages){pdfPage=n;drawPdfPage(0)}};
 pdfGestures($("#pdfStage"));
 const status=$("#pdfStatus");
 try{
  if(!window.pdfjsLib)throw Error("Chưa tải được thư viện đọc PDF. Vui lòng kiểm tra kết nối Internet rồi thử lại.");
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  let bytes;
  if(pdfCache.id===d.fileId)bytes=pdfCache.bytes;
  else{const result=await api("getPdf",{fileId:d.fileId});if(!$("#pv"))return;const raw=atob(result.base64);bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);pdfCache={id:d.fileId,bytes}}
  const doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  if(!$("#pv")){doc.destroy();return}
  activePdf=doc;status.classList.add("hidden");
  await drawPdfPage();
  window.onresize=()=>{if(activePdf&&$("#pdfCanvas"))drawPdfPage().catch(e=>console.error(e))};
 }catch(err){if($("#pdfStatus"))$("#pdfStatus").innerHTML=`Không thể hiển thị PDF: ${esc(err.message||err)}<br><a class="btn" style="margin-top:9px" href="${download}" target="_blank" rel="noopener">⬇ Tải PDF để xem</a>`;else toast(err.message||"Không đọc được PDF.")}
};
const fld=(k,l,t,v="",o)=>`<div class="field"><label>${l}</label>${t==="area"?`<textarea name="${k}">${esc(v)}</textarea>`:t==="sel"?`<select name="${k}">${o.map(x=>`<option ${x===v?"selected":""}>${x}</option>`).join("")}</select>`:`<input name="${k}" type="${t}" value="${esc(v)}">`}</div>`;
window.form=(type,id)=>{const x=(type==="doc"?data.documents:data.tasks).find(v=>v.id===id)||{};ed={type,id:id||"",fileId:x.fileId};
 const h=type==="doc"?fld("title","Tên tài liệu *","text",x.title)+fld("code","Số, ký hiệu","text",x.code)+fld("group","Nhóm","sel",x.group||(page==="skills"?"Nghiệp vụ":dgroup||"Trung ương"),[...GROUPS,"Nghiệp vụ"])+fld("date","Ngày ban hành","date",x.date)+fld("summary","Trích yếu","area",x.summary)+`<div class="field"><label>File PDF ${id?"(bỏ trống nếu giữ nguyên)":"*"} · tối đa 10 MB</label><input id="file" type="file" accept="application/pdf"></div>`
 :fld("title","Tên nhiệm vụ *","text",x.title)+fld("description","Nội dung","area",x.description)+fld("period","Chu kỳ","sel",x.period||tperiod||"Tháng",PERIODS)+fld("time","Kỳ (VD: Quý IV/2026, Tháng 11/2026)","text",x.time)+fld("unit","Người/đơn vị phụ trách","text",x.unit)+fld("deadline","Thời hạn","date",x.deadline)+fld("status","Tiến độ","sel",x.status||STATUS[0],STATUS);
 modal((id?"Cập nhật ":"Thêm ")+(type==="doc"?"tài liệu":"nhiệm vụ"),`<form id="f">${h}<div class="row"><button class="btn" id="save">Lưu</button><button type="button" class="btn light" onclick="closeM2()">Hủy</button></div></form>`);$("#f").onsubmit=submit};
window.closeM2=closeM;
document.addEventListener("click",e=>{const a=e.target.closest("[data-add]");if(a)form(a.dataset.add)});
const b64=f=>new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result.split(",")[1]);x.onerror=j;x.readAsDataURL(f)});
async function submit(e){e.preventDefault();const item=Object.fromEntries(new FormData(e.target).entries());if(!item.title.trim())return toast("Nhập tên.");
 const p={type:ed.type==="doc"?"documents":"tasks",id:ed.id,item};
 if(ed.type==="doc"){const f=$("#file").files[0];if(!ed.id&&!f)return toast("Chọn file PDF.");if(f){if(f.type!=="application/pdf")return toast("Chỉ nhận file PDF.");if(f.size>10*1048576)return toast("File quá 10 MB.");p.fileName=f.name;p.fileB64=await b64(f)}}
 $("#save").disabled=true;$("#save").textContent="Đang lưu...";
 try{await api("save",p);closeM();toast("Đã lưu.");load()}catch(err){toast(err.message);$("#save").disabled=false;$("#save").textContent="Lưu"}}
window.del=(type,id)=>{const x=(data[type]||[]).find(v=>v.id===id);if(!x)return;
 modal("Xác nhận xóa",`<p>Bạn có chắc chắn muốn xóa:<br><b>${esc(x.title)}</b>?</p><p class="muted">${type==="documents"?"File PDF cũng sẽ bị xóa khỏi kho lưu trữ. ":""}Không thể hoàn tác.</p><div class="row"><button class="btn red" id="yes">Xóa</button><button class="btn light" onclick="closeM2()">Hủy</button></div>`);
 $("#yes").onclick=async()=>{$("#yes").disabled=true;$("#yes").textContent="Đang xóa...";try{await api("delete",{type,id});closeM();toast("Đã xóa.");load()}catch(e){closeM();toast(e.message)}}};
if("serviceWorker"in navigator)addEventListener("load",()=>void 0);
addEventListener("load",load);
