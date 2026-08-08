
/* V16 Cloud Media Manager — Supabase Storage + site_content metadata */
const MEDIA_BUCKET='portfolio-media';
const MEDIA_SECTION='media';

const SOCIAL_DEFAULTS = {
  email:{label:'Gmail',url:'',enabled:true,icon:''},
  linkedin:{label:'LinkedIn',url:'',enabled:true,icon:''},
  scholar:{label:'Google Scholar',url:'',enabled:true,icon:''},
  orcid:{label:'ORCID',url:'',enabled:true,icon:''}
};
const SOCIAL_KEYS=Object.keys(SOCIAL_DEFAULTS);

async function getCloudMedia(){
  const content=await portfolioDB.loadContent();
  return content?.[MEDIA_SECTION] || {};
}

async function saveCloudMedia(media){
  const content=await portfolioDB.loadContent() || {};
  content[MEDIA_SECTION]=media;
  await portfolioDB.saveContent(content);
}

function safeFileName(name){
  return (name||'file').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,90);
}

function readFileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('Could not read the logo file.'));
    reader.readAsDataURL(file);
  });
}

async function uploadPortfolioFile(file,folder,allowedTypes,maxBytes){
  if(!file) throw new Error('Please choose a file first.');
  if(allowedTypes && !allowedTypes.includes(file.type)) throw new Error('Unsupported file type.');
  if(maxBytes && file.size>maxBytes) throw new Error(`File is too large. Maximum size is ${Math.round(maxBytes/1024/1024)} MB.`);
  const c=portfolioDB.client();
  if(!c) throw new Error('Supabase is not configured.');
  if(!(await portfolioDB.isAdmin())) throw new Error('Admin access is required.');
  const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeFileName(file.name)}`;
  const {error}=await c.storage.from(MEDIA_BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined,cacheControl:'31536000'});
  if(error) throw error;
  const {data}=c.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return {path,url:data.publicUrl,name:file.name,type:file.type,size:file.size};
}

async function deletePortfolioFile(path){
  if(!path) return;
  const c=portfolioDB.client();
  if(!c) return;
  const {error}=await c.storage.from(MEDIA_BUCKET).remove([path]);
  if(error) console.warn('Storage delete warning:',error);
}

async function getSocials(){
  const media=await getCloudMedia();
  return {...SOCIAL_DEFAULTS,...(media.footerSocials||{})};
}
function defaultSocialIcon(key){
  const icons={email:'✉',linkedin:'in',scholar:'🎓',orcid:'iD'};
  return icons[key]||'●';
}
async function refreshSocialEditor(){
  const data=await getSocials();
  SOCIAL_KEYS.forEach(key=>{
    const d=data[key]||SOCIAL_DEFAULTS[key];
    const label=document.querySelector(`[data-social-label="${key}"]`);
    const url=document.querySelector(`[data-social-url="${key}"]`);
    const enabled=document.querySelector(`[data-social-enabled="${key}"]`);
    const preview=document.querySelector(`[data-social-preview="${key}"]`);
    if(label) label.value=d.label||SOCIAL_DEFAULTS[key].label;
    if(url) url.value=d.url||'';
    if(enabled) enabled.checked=d.enabled!==false;
    if(preview) preview.innerHTML=d.icon ? `<img src="${d.icon}" alt=""> <span>Cloud icon uploaded</span>` : `<span style="font-size:20px">${defaultSocialIcon(key)}</span><span>Default icon</span>`;
  });
}
async function saveSocials(){
  try{
    const old=await getSocials();
    const data={};
    for(const key of SOCIAL_KEYS){
      const previous=old[key]||SOCIAL_DEFAULTS[key];
      const file=document.querySelector(`[data-social-icon="${key}"]`)?.files?.[0];
      let icon=previous.icon||'';
      let iconPath=previous.iconPath||'';
      if(file){
        if(!file.type.startsWith('image/')) throw new Error(`Please select an image for ${key}.`);
        const uploaded=await uploadPortfolioFile(file,`social/${key}`,null,2*1024*1024);
        if(iconPath) await deletePortfolioFile(iconPath);
        icon=uploaded.url; iconPath=uploaded.path;
      }
      data[key]={
        label:document.querySelector(`[data-social-label="${key}"]`)?.value.trim()||SOCIAL_DEFAULTS[key].label,
        url:document.querySelector(`[data-social-url="${key}"]`)?.value.trim()||'',
        enabled:!!document.querySelector(`[data-social-enabled="${key}"]`)?.checked,
        icon,iconPath
      };
    }
    const media=await getCloudMedia();
    media.footerSocials=data;
    await saveCloudMedia(media);
    await refreshSocialEditor();
    alert('Footer Connect links and icons saved to Supabase.');
  }catch(e){alert('Could not save footer links/icons: '+(e.message||e));}
}
async function resetSocials(){
  try{
    const media=await getCloudMedia();
    for(const key of SOCIAL_KEYS){ if(media.footerSocials?.[key]?.iconPath) await deletePortfolioFile(media.footerSocials[key].iconPath); }
    media.footerSocials=SOCIAL_DEFAULTS;
    await saveCloudMedia(media); await refreshSocialEditor();
    alert('Footer links/icons reset.');
  }catch(e){alert('Could not reset footer links/icons: '+(e.message||e));}
}

async function refreshMediaPanel(){
  const media=await getCloudMedia();
  const logo=media.siteLogo;
  const lp=document.getElementById('siteLogoPreview');
  if(lp){
    if(logo?.url || logo?.dataUrl || logo?.path){
      const previewUrl=logo.dataUrl || (logo.path && portfolioDB.publicUrl ? portfolioDB.publicUrl(MEDIA_BUCKET,logo.path) : logo.url)||logo.url;
      lp.innerHTML=`<img src="${previewUrl}" alt="${esc(logo.alt||'Logo preview')}">`;
      document.getElementById('siteLogoAlt').value=logo.alt||'';
      // V44: saved logos are visible by default unless explicitly disabled.
      document.getElementById('siteLogoEnabled').checked=logo.enabled !== false;
      document.getElementById('siteLogoHideName').checked=!!logo.hideName;
    }else{
      lp.innerHTML='<div class="media-preview-placeholder">No logo uploaded</div>';
      document.getElementById('siteLogoEnabled').checked=false;
      document.getElementById('siteLogoHideName').checked=false;
    }
  }
  const cp=document.getElementById('cvPreview');
  if(cp) cp.innerHTML=(media.academicCvPdf?.name||media.cvPdf?.name) ? `<strong>Current Academic CV</strong><br>${esc((media.academicCvPdf||media.cvPdf).name)}` : '<div class="media-preview-placeholder">No Academic CV uploaded</div>';
  const rp=document.getElementById('corporateResumePreview');
  if(rp) rp.innerHTML=media.corporateResumePdf?.name ? `<strong>Current Professional Resume</strong><br>${esc(media.corporateResumePdf.name)}` : '<div class="media-preview-placeholder">No Professional Resume uploaded</div>';
  const pp=document.getElementById('imagePreview');
  if(pp && media.profilePhoto?.url) pp.src=media.profilePhoto.url;
}

async function saveLogoCloud(){
  try{
    const media=await getCloudMedia();
    const file=document.getElementById('siteLogoInput')?.files?.[0];
    let current=media.siteLogo||{};
    if(file){
      const allowed=['image/png','image/jpeg','image/webp','image/svg+xml'];
      if(!allowed.includes(file.type)) throw new Error('Logo must be PNG, JPG/JPEG, WebP, or SVG.');
      // V44: file size is validated, but it is not the rendering mechanism.
      // PNG is fully supported; a larger file is primarily a performance concern.
      if(file.size>2*1024*1024) throw new Error('Please use a logo image smaller than 2 MB.');
      const dataUrl=await readFileAsDataUrl(file);
      if(!dataUrl.startsWith('data:image/')) throw new Error('The selected logo could not be read as an image.');
      const uploaded=await uploadPortfolioFile(file,'logo',allowed,5*1024*1024);
      if(current.path) await deletePortfolioFile(current.path);
      current={...current,url:uploaded.url,path:uploaded.path,name:uploaded.name,type:uploaded.type,size:uploaded.size,dataUrl};
      // Uploading a new logo automatically enables it. Uncheck the option only
      // when you intentionally want to keep the saved logo hidden.
      const enabledBox=document.getElementById('siteLogoEnabled');
      if(enabledBox) enabledBox.checked=true;
    }
    if(!current.dataUrl && !current.url && !current.path) throw new Error('Please choose a logo file first.');
    current.alt=document.getElementById('siteLogoAlt').value.trim()||'Pratiksha Pathak logo';
    current.enabled=document.getElementById('siteLogoEnabled').checked;
    current.hideName=document.getElementById('siteLogoHideName').checked;
    current.version=Date.now().toString();
    // V45: retain a browser-local embedded copy as a second resilience layer.
    // This does not replace Supabase; it prevents a broken/blocked Storage URL
    // from making an otherwise valid saved logo disappear on the public site.
    current.cachedDataUrl=current.dataUrl||'';
    current.version=Date.now();
    media.siteLogo=current;
    await saveCloudMedia(media);
    try{
      const local=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      local.media={...(local.media||{}),siteLogo:current};
      localStorage.setItem(STORAGE_KEY,JSON.stringify(local));
    }catch(e){ console.warn('Local logo cache could not be updated.',e); }
    await refreshMediaPanel();
    alert('Logo saved successfully. The public header will use the saved logo with a local fallback if needed.');
  }catch(e){alert('Could not save logo: '+(e.message||e));}
}
async function removeLogoCloud(){
  try{
    const media=await getCloudMedia();
    if(media.siteLogo?.path) await deletePortfolioFile(media.siteLogo.path);
    delete media.siteLogo;
    await saveCloudMedia(media); await refreshMediaPanel();
    alert('Logo removed.');
  }catch(e){alert('Could not remove logo: '+(e.message||e));}
}
async function upsertPublishedResource(title, description, uploaded, icon='▤', category='Academic'){
  const all=await portfolioDB.loadAllResources();
  const existing=(all||[]).find(r=>String(r.title||'').trim().toLowerCase()===title.trim().toLowerCase());
  await portfolioDB.upsertResources([{...(existing?.id ? {id:existing.id} : {}),title,description,category,resource_url:'',file_url:uploaded?.url||'',icon_url:existing?.icon_url||icon,published:true}]);
}
async function removePublishedResource(title){
  const all=await portfolioDB.loadAllResources();
  const existing=(all||[]).find(r=>String(r.title||'').trim().toLowerCase()===title.trim().toLowerCase());
  if(existing?.id) await portfolioDB.deleteResourceById(existing.id);
}
async function saveAcademicCvCloud(){
  try{
    const file=document.getElementById('cvPdfInput')?.files?.[0];
    if(!file) throw new Error('Please choose your Academic CV PDF first.');
    if(file.type!=='application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Please upload a PDF file only.');
    const uploaded=await uploadPortfolioFile(file,'academic-cv',['application/pdf'],15*1024*1024);
    const media=await getCloudMedia();
    if(media.academicCvPdf?.path) await deletePortfolioFile(media.academicCvPdf.path);
    media.academicCvPdf=uploaded; media.cvPdf=uploaded;
    await saveCloudMedia(media);
    await upsertPublishedResource('Academic CV','Research, teaching, qualifications, and academic profile.',uploaded,'▤','Academic');     await removePublishedResource('Curriculum Vitae');
    await refreshMediaPanel();
    alert('Academic CV uploaded and published in Resources.');
  }catch(e){alert('Could not save Academic CV: '+(e.message||e));}
}
async function removeAcademicCvCloud(){
  try{
    const media=await getCloudMedia();
    if(media.academicCvPdf?.path) await deletePortfolioFile(media.academicCvPdf.path);
    else if(media.cvPdf?.path) await deletePortfolioFile(media.cvPdf.path);
    delete media.academicCvPdf; delete media.cvPdf;
    await saveCloudMedia(media);
    await removePublishedResource('Academic CV'); await removePublishedResource('Curriculum Vitae');
    await refreshMediaPanel();
    alert('Academic CV removed from the website and Resources.');
  }catch(e){alert('Could not remove Academic CV: '+(e.message||e));}
}
async function saveCorporateResumeCloud(){
  try{
    const file=document.getElementById('corporateResumeInput')?.files?.[0];
    if(!file) throw new Error('Please choose your Corporate Resume PDF first.');
    if(file.type!=='application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Please upload a PDF file only.');
    const uploaded=await uploadPortfolioFile(file,'corporate-resume',['application/pdf'],15*1024*1024);
    const media=await getCloudMedia();
    if(media.corporateResumePdf?.path) await deletePortfolioFile(media.corporateResumePdf.path);
    media.corporateResumePdf=uploaded;
    await saveCloudMedia(media);
    await upsertPublishedResource('Professional Resume','Corporate HR experience, skills, projects, and professional profile.',uploaded,'▣','Professional');
    await refreshMediaPanel();
    alert('Professional Resume uploaded and published in Resources.');
  }catch(e){alert('Could not save Professional Resume: '+(e.message||e));}
}
async function removeCorporateResumeCloud(){
  try{
    const media=await getCloudMedia();
    if(media.corporateResumePdf?.path) await deletePortfolioFile(media.corporateResumePdf.path);
    delete media.corporateResumePdf;
    await saveCloudMedia(media); await removePublishedResource('Professional Resume');
    await refreshMediaPanel();
    alert('Professional Resume removed from the website and Resources.');
  }catch(e){alert('Could not remove Professional Resume: '+(e.message||e));}
}

async function saveProfileCloud(){
  try{
    const file=document.getElementById('profileImageInput')?.files?.[0];
    if(!file) throw new Error('Please choose a profile photo first.');
    if(!file.type.startsWith('image/')) throw new Error('Please select an image file.');
    const uploaded=await uploadPortfolioFile(file,'profile',['image/jpeg','image/png','image/webp'],8*1024*1024);
    const media=await getCloudMedia();
    if(media.profilePhoto?.path) await deletePortfolioFile(media.profilePhoto.path);
    media.profilePhoto={...uploaded,alt:'Professional portrait of Pratiksha Pathak'};
    await saveCloudMedia(media); await refreshMediaPanel();
    alert('Profile photo uploaded to Supabase Storage.');
  }catch(e){alert('Could not save profile photo: '+(e.message||e));}
}
async function removeProfileCloud(){
  try{
    const media=await getCloudMedia();
    if(media.profilePhoto?.path) await deletePortfolioFile(media.profilePhoto.path);
    delete media.profilePhoto;
    await saveCloudMedia(media); await refreshMediaPanel();
    document.getElementById('imagePreview').src='assets/profile.png';
    alert('Cloud profile photo removed. The default portrait will show.');
  }catch(e){alert('Could not remove profile photo: '+(e.message||e));}
}

async function migrateLegacyMedia(){
  alert('V16 stores new uploads in Supabase Storage. If you previously uploaded media in this browser, we can migrate it after the cloud setup is verified.');
}


let mediaLibraryRows=[];

function mediaKind(mime=''){
  if(mime.startsWith('image/')) return 'image';
  if(mime==='application/pdf') return 'pdf';
  if(mime.startsWith('video/')) return 'video';
  if(/presentation|powerpoint/.test(mime) || /\.pptx?$/.test(mime)) return 'presentation';
  if(/spreadsheet|excel/.test(mime) || /\.(xlsx?|csv)$/.test(mime)) return 'spreadsheet';
  if(/word|document/.test(mime) || /\.docx?$/.test(mime)) return 'document';
  return 'other';
}
function formatBytes(bytes){
  const n=Number(bytes)||0;
  if(!n) return '—';
  if(n<1024) return `${n} B`;
  if(n<1024*1024) return `${(n/1024).toFixed(1)} KB`;
  if(n<1024*1024*1024) return `${(n/1024/1024).toFixed(1)} MB`;
  return `${(n/1024/1024/1024).toFixed(1)} GB`;
}
function mediaDate(value){
  if(!value) return '—';
  try{return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));}catch{return '—';}
}
function mediaTypeLabel(kind){return ({image:'Image',pdf:'PDF',video:'Video',presentation:'Presentation',spreadsheet:'Spreadsheet',document:'Document',other:'File'})[kind]||'File';}
function mediaMatches(row){
  const q=(document.getElementById('mediaLibrarySearch')?.value||'').trim().toLowerCase();
  const type=document.getElementById('mediaLibraryType')?.value||'all';
  const status=document.getElementById('mediaLibraryStatusFilter')?.value||'all';
  const cat=document.getElementById('mediaLibraryCategory')?.value||'all';
  const hay=[row.title,row.file_name,row.category,row.description].join(' ').toLowerCase();
  if(q && !hay.includes(q)) return false;
  if(type!=='all' && mediaKind(row.mime_type)!==type) return false;
  if(status==='published' && row.published===false) return false;
  if(status==='draft' && row.published!==false) return false;
  if(status==='featured' && !row.featured) return false;
  if(cat!=='all' && (row.category||'Uncategorised')!==cat) return false;
  return true;
}
function mediaUsage(row){
  const urls=[row.public_url,row.storage_path,row.file_name].filter(Boolean);
  if(!urls.length) return [];
  const hits=[];
  const content=window.__portfolioContent||{};
  function walk(value,path=''){
    if(typeof value==='string'){
      if(urls.some(x=>x && value.includes(x))) hits.push(path||'Site content');
      return;
    }
    if(Array.isArray(value)){value.forEach((v,i)=>walk(v,`${path}[${i}]`));return;}
    if(value && typeof value==='object') Object.entries(value).forEach(([k,v])=>walk(v,path?`${path}.${k}`:k));
  }
  walk(content);
  const resources=window.__portfolioResources||[];
  resources.forEach(r=>{if(urls.some(x=>x && [r.file_url,r.resource_url,r.icon_url].filter(Boolean).some(v=>String(v).includes(x)))) hits.push(`Resource: ${r.title||'Untitled'}`);});
  return [...new Set(hits)];
}
function makeMediaThumb(row){
  const src=row.thumbnail_url||row.public_url;
  const kind=mediaKind(row.mime_type);
  if(src && (kind==='image' || row.thumbnail_url)) return `<img src="${esc(src)}" alt="">`;
  const icon={pdf:'PDF',video:'▶',presentation:'PPT',spreadsheet:'XLS',document:'DOC',other:'FILE'}[kind]||'FILE';
  return `<div class="media-file-icon"><span>${icon}</span></div>`;
}
function updateCategoryOptions(){
  const select=document.getElementById('mediaLibraryCategory'); if(!select) return;
  const current=select.value;
  const cats=[...new Set(mediaLibraryRows.map(r=>(r.category||'Uncategorised').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  select.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  select.value=cats.includes(current)?current:'all';
}
function renderMediaLibrary(){
  const root=document.getElementById('mediaLibraryEditor'); if(!root) return;
  const filtered=mediaLibraryRows.filter(mediaMatches);
  const summary=document.getElementById('mediaLibrarySummary');
  const published=mediaLibraryRows.filter(r=>r.published!==false).length;
  const drafts=mediaLibraryRows.length-published;
  const featured=mediaLibraryRows.filter(r=>r.featured).length;
  if(summary) summary.innerHTML=`<span><strong>${mediaLibraryRows.length}</strong> total</span><span><strong>${published}</strong> published</span><span><strong>${drafts}</strong> drafts</span><span><strong>${featured}</strong> featured</span><span><strong>${filtered.length}</strong> shown</span>`;
  root.innerHTML='';
  if(!filtered.length){root.innerHTML='<div class="library-empty"><strong>No media matches your filters.</strong><span>Clear the search/filter or add a new media item.</span></div>';return;}
  filtered.forEach((row)=>appendMediaLibraryEditor(row));
}
async function refreshMediaLibrary(){
  const status=document.getElementById('mediaLibraryStatus');
  try{
    const rows=await portfolioDB.loadMediaLibrary(true);
    if(rows===null){mediaLibraryRows=[]; if(status) status.textContent='Connect Supabase to use the cloud Media Library.'; renderMediaLibrary(); return;}
    mediaLibraryRows=rows||[];
    try{window.__portfolioContent=await portfolioDB.loadContent()||{};}catch{window.__portfolioContent={};}
    try{window.__portfolioResources=await portfolioDB.loadAllResources()||[];}catch{window.__portfolioResources=[];}
    updateCategoryOptions();
    if(status) status.textContent=`${mediaLibraryRows.length} media item${mediaLibraryRows.length===1?'':'s'} loaded. Drafts are private until published.`;
    renderMediaLibrary();
  }catch(e){ if(status) status.textContent='Media Library table is not available yet. Run SUPABASE_PATCH_V40.sql in Supabase SQL Editor, then reload this page.'; console.warn(e); }
}
function appendMediaLibraryEditor(row={}){
  const root=document.getElementById('mediaLibraryEditor'); if(!root) return;
  const div=document.createElement('article'); div.className='media-library-item'; div.dataset.id=row.id||'';
  div.dataset.storagePath=row.storage_path||''; div.dataset.thumbnailPath=row.thumbnail_path||''; div.dataset.publicUrl=row.public_url||''; div.dataset.thumbnailUrl=row.thumbnail_url||'';
  div.dataset.fileName=row.file_name||''; div.dataset.mimeType=row.mime_type||''; div.dataset.fileSize=String(row.file_size||0);
  const kind=mediaKind(row.mime_type), usage=mediaUsage(row);
  div.innerHTML=`
    <div class="media-library-thumb">${makeMediaThumb(row)}<div class="media-badges"><span>${mediaTypeLabel(kind)}</span>${row.featured?'<span class="badge-featured">★ Featured</span>':''}${row.published===false?'<span class="badge-draft">Draft</span>':''}</div></div>
    <div class="media-library-fields">
      <div class="list-item-head"><div><strong>${esc(row.file_name||'New media item')}</strong><small class="media-updated">Updated ${mediaDate(row.updated_at)}</small></div><button type="button" class="small-btn danger" data-media-remove>Delete</button></div>
      <div class="grid two">
        <label>Title<input data-media="title" value="${esc(row.title||'')}"></label>
        <label>Category<input data-media="category" value="${esc(row.category||'')}" placeholder="Research / Teaching / Presentation / Resource"></label>
        <label class="full">Description<textarea data-media="description" placeholder="Optional description for your own organisation">${esc(row.description||'')}</textarea></label>
        <label>Replace file<input type="file" data-media-file accept="image/*,application/pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.zip,.mp4,.webm,.mov"></label>
        <label>Replace thumbnail<input type="file" data-media-thumb accept="image/png,image/jpeg,image/webp"></label>
        <label>Display order<input type="number" min="0" data-media="order" value="${Number(row.sort_order)||0}"></label>
        <label>Status<select data-media="published"><option value="published" ${row.published!==false?'selected':''}>Published</option><option value="draft" ${row.published===false?'selected':''}>Draft</option></select></label>
        <label class="feature-option ${row.featured?'is-on':''}"><input type="checkbox" data-media="featured" ${row.featured?'checked':''}><span><strong>★ Feature this media</strong><small>Use this asset in featured areas when connected to portfolio content.</small></span></label>
      </div>
      <div class="media-meta"><span>${mediaTypeLabel(kind)}</span><span>${formatBytes(row.file_size)}</span><span>Uploaded ${mediaDate(row.created_at)}</span>${row.public_url?`<button type="button" class="link-btn" data-copy-media>Copy URL</button>`:''}</div>
      <div class="media-usage ${usage.length?'is-used':'is-free'}"><strong>${usage.length?'Used in portfolio':'Not currently detected in portfolio content'}</strong>${usage.length?`<span>${usage.slice(0,3).map(esc).join(' · ')}${usage.length>3?` · +${usage.length-3} more`:''}</span>`:'<span>Safe to delete if you no longer need this asset.</span>'}</div>
      <p class="media-library-file-note">${row.file_name?`Current file: ${esc(row.file_name)}`:'No file uploaded yet.'}</p>
    </div>`;
  div.querySelector('[data-media-remove]').addEventListener('click',async()=>{
    const used=mediaUsage(row);
    const warning=used.length?`\n\nThis media is referenced by: ${used.slice(0,4).join(', ')}. Deleting it may break those references.`:'';
    if(confirm(`Delete this media item and its stored files?${warning}`)){div.dataset.deleted='true';div.remove();}
  });
  div.querySelector('[data-media="featured"]')?.addEventListener('change',e=>e.target.closest('.feature-option')?.classList.toggle('is-on',e.target.checked));
  div.querySelector('[data-copy-media]')?.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(row.public_url);div.querySelector('[data-copy-media]').textContent='Copied';setTimeout(()=>div.querySelector('[data-copy-media]').textContent='Copy URL',1200);}catch{prompt('Copy this media URL:',row.public_url);}
  });
  root.appendChild(div);
}
function collectMediaLibrary(){
  return [...document.querySelectorAll('#mediaLibraryEditor .media-library-item')].map((el,i)=>({
    id:el.dataset.id?Number(el.dataset.id):null,
    title:el.querySelector('[data-media="title"]')?.value.trim()||'',
    category:el.querySelector('[data-media="category"]')?.value.trim()||'',
    description:el.querySelector('[data-media="description"]')?.value||'',
    sort_order:Number(el.querySelector('[data-media="order"]')?.value)||i,
    published:el.querySelector('[data-media="published"]')?.value!=='draft',
    featured:!!el.querySelector('[data-media="featured"]')?.checked,
    file_name:el.dataset.fileName||'',storage_path:el.dataset.storagePath||'',public_url:el.dataset.publicUrl||'',thumbnail_path:el.dataset.thumbnailPath||'',thumbnail_url:el.dataset.thumbnailUrl||'',mime_type:el.dataset.mimeType||'',file_size:Number(el.dataset.fileSize)||0,_el:el
  }));
}
async function saveMediaLibrary(){
  const status=document.getElementById('mediaLibraryStatus');
  const saveBtn=document.getElementById('saveMediaLibrary');
  try{
    if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Saving…';}
    const rows=collectMediaLibrary();
    const replacedFiles=[];
    const replacedThumbs=[];
    for(const row of rows){
      const el=row._el; const file=el.querySelector('[data-media-file]')?.files?.[0]; const thumb=el.querySelector('[data-media-thumb]')?.files?.[0];
      if(file){
        const oldPath=row.storage_path;
        const uploaded=await uploadPortfolioFile(file,'library',null,50*1024*1024);
        Object.assign(row,{file_name:uploaded.name,storage_path:uploaded.path,public_url:uploaded.url,mime_type:uploaded.type,file_size:uploaded.size});
        el.dataset.storagePath=uploaded.path;el.dataset.publicUrl=uploaded.url;el.dataset.fileName=uploaded.name;el.dataset.mimeType=uploaded.type;el.dataset.fileSize=uploaded.size;
        if(oldPath) replacedFiles.push(oldPath);
      }
      if(thumb){
        const oldThumb=row.thumbnail_path;
        const uploaded=await uploadPortfolioFile(thumb,'library-thumbnails',['image/png','image/jpeg','image/webp'],8*1024*1024);
        Object.assign(row,{thumbnail_path:uploaded.path,thumbnail_url:uploaded.url});
        el.dataset.thumbnailPath=uploaded.path;el.dataset.thumbnailUrl=uploaded.url;
        if(oldThumb) replacedThumbs.push(oldThumb);
      }
      delete row._el;
    }
    const existing=await portfolioDB.loadMediaLibrary(true);
    const keepIds=rows.map(x=>x.id).filter(Boolean);
    const removed=[];
    for(const old of (existing||[])){
      if(old.id && !keepIds.includes(old.id)){
        const used=mediaUsage(old);
        if(used.length && !confirm(`“${old.title||old.file_name}” is still referenced by ${used.slice(0,3).join(', ')}. Delete anyway?`)){
          rows.push(old); keepIds.push(old.id); continue;
        }
        removed.push(old);
      }
    }
    // Commit metadata first. Old files are deleted only after the database save succeeds,
    // so a failed save never destroys the previously working asset.
    await portfolioDB.upsertMediaLibrary(rows);
    for(const old of removed){
      if(old.storage_path) await deletePortfolioFile(old.storage_path);
      if(old.thumbnail_path) await deletePortfolioFile(old.thumbnail_path);
      await portfolioDB.deleteMediaLibraryById(old.id);
    }
    for(const path of replacedFiles) await deletePortfolioFile(path);
    for(const path of replacedThumbs) await deletePortfolioFile(path);
    if(status) status.textContent=`Media Library saved successfully — ${rows.length} item${rows.length===1?'':'s'}.`;
    await refreshMediaLibrary();
  }catch(e){ if(status) status.textContent='Could not save Media Library: '+(e.message||e); }
  finally{if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Save Media Library';}}
}

document.addEventListener('DOMContentLoaded',()=>{
  refreshMediaPanel().catch(console.warn);
  refreshSocialEditor().catch(console.warn);
  document.getElementById('saveSiteLogo')?.addEventListener('click',saveLogoCloud);
  document.getElementById('removeSiteLogo')?.addEventListener('click',removeLogoCloud);
  document.getElementById('saveCvPdf')?.addEventListener('click',saveAcademicCvCloud);
  document.getElementById('removeCvPdf')?.addEventListener('click',removeAcademicCvCloud);
  document.getElementById('saveCorporateResume')?.addEventListener('click',saveCorporateResumeCloud);
  document.getElementById('removeCorporateResume')?.addEventListener('click',removeCorporateResumeCloud);
  document.getElementById('saveProfilePhoto')?.addEventListener('click',saveProfileCloud);
  document.getElementById('removeProfilePhoto')?.addEventListener('click',removeProfileCloud);
  document.getElementById('saveFooterSocials')?.addEventListener('click',saveSocials);
  document.getElementById('resetFooterSocials')?.addEventListener('click',resetSocials);
  refreshMediaLibrary().catch(console.warn);
  document.getElementById('saveMediaLibrary')?.addEventListener('click',saveMediaLibrary);
  ['mediaLibrarySearch','mediaLibraryType','mediaLibraryStatusFilter','mediaLibraryCategory'].forEach(id=>document.getElementById(id)?.addEventListener('input',renderMediaLibrary));
  document.getElementById('addMediaLibraryItem')?.addEventListener('click',()=>appendMediaLibraryEditor({published:true,featured:false,sort_order:mediaLibraryRows.length}));
});

const STORAGE_KEY='pratikshaPortfolioContentV1';
const DEFAULT_PRESENTATION_ITEMS=[
 {title:'Academic Presentation',type:'Presentation',description:'Add a presentation description.',tags:'AI, HRM',url:'#',fileUrl:'',published:true}
];
const DEFAULT_EXPERIENCE_ITEMS=[
 {role:'HR Generalist',company:'Startup / Organisation',location:'Pune, Maharashtra, India',start:'Month 20XX',end:'Month 20XX',type:'Full-time',description:'Managed day-to-day HR operations and employee lifecycle activities in a startup environment.',details:'Recruitment and onboarding|Employee engagement and HR operations|HR documentation and coordination|Employee lifecycle support',achievements:'Add measurable achievements, projects, or impact here.'}
];
const DEFAULT_TEACHING_ITEMS=[
 {title:'Demo Lecture: Stress Management & Work-Life Balance',type:'Demo Lecture',category:'HRM',subjects:'Human Resource Management, Stress Management, Work-Life Balance',description:'Sample academic lecture for management and HRM learners.',tags:'HRM, Stress Management, Work-Life Balance',url:'#',featured:false,published:true},
 {title:'AI in Human Resource Management',type:'Academic Lecture',category:'AI & HRM',subjects:'AI in HRM, HR Analytics, Human Resource Management',description:'Planned teaching resource on AI applications across the HR lifecycle.',tags:'AI, HRM, HR Analytics',url:'#',featured:false,published:true},
 {title:'Research Methodology & Data Analysis',type:'Teaching Resource',category:'Research Methods',subjects:'Research Methodology, Data Analysis, SPSS',description:'Planned resource covering research design, variables, sampling and analysis.',tags:'Research Methods, SPSS, Data Analysis',url:'#',featured:false,published:true}
];
const DEFAULT_PUBLICATIONS=[
 {title:'Barriers to AI Adoption in Human Resource Functions',authors:'Author details to be added',venue:'Target journal / publication venue',year:'2026',type:'Review Article',status:'Working Paper',category:'AI Adoption, HRM',abstract:'Narrative review examining barriers to AI adoption in HR functions.',keywords:'AI, HRM, AI adoption, barriers',doi:'',pdf:'',projectUrl:'',featured:false,published:true},
 {title:'Artificial Intelligence in Human Resource Management: Research Trends, Emerging Themes, and Future Directions',authors:'Author details to be added',venue:'Target journal / publication venue',year:'2026',type:'Systematic Literature Review',status:'Working Paper',category:'AI in HRM, Research Trends',abstract:'Review of research trends, emerging themes, and future directions in AI-enabled HRM.',keywords:'Artificial Intelligence, Human Resource Management, research trends',doi:'',pdf:'',projectUrl:'',featured:false,published:true}
];
const DEFAULT_LISTS={
qualifications:[
 {label:'CURRENT',title:'PhD — AI in Human Resource Management',text:'Department of Commerce & Management, Swami Ramanand Teerth Marathwada University, Nanded.'},
 {label:'QUALIFICATION',title:'UGC NET — Management',text:'Qualified National Eligibility Test in Management.'},
 {label:'POSTGRADUATE',title:'MBA — Human Resource Management',text:'Indira Institute of Management Sciences, Nanded.'},
 {label:'UNDERGRADUATE',title:'BE — Computer Engineering',text:'MBES College of Engineering, Ambajogai.'}
],
resources:[
 {icon:'▤',title:'Curriculum Vitae',text:'Academic and professional profile.',label:'CV will be added →',url:'#'},
 {icon:'◫',title:'Research Papers',text:'Publications, manuscripts, and research work.',label:'Explore research →',url:'#research'},
 {icon:'▣',title:'Teaching Videos',text:'Demo lectures and academic video resources.',label:'Explore teaching →',url:'#teaching'},
 {icon:'□',title:'Presentations',text:'Academic presentations and professional materials.',label:'Coming soon →',url:'#'}
],
teachingFeatures:[
 'Conceptual clarity through structured explanations',
 'Case-based and real-world learning',
 'Technology-enabled and data-informed teaching',
 'Demo lectures and academic video resources'
]};
const DEFAULT={heroEyebrow:'WELCOME TO MY PORTFOLIO',heroFirstName:'Pratiksha',heroLastName:'Pathak',heroTitle:'HR Professional | Researcher | UGC NET (Management)',heroText:'Exploring the intersection of Artificial Intelligence, Human Resource Management, and the future of work to create meaningful impact through research, teaching, and practice.',heroResearchCta:'Explore My Research →',heroTeachingCta:'Teaching Portfolio →',heroCvCta:'Download CV ↓',cvLabel:'Download CV',portraitLabel:'RESEARCHING',portraitTitle:'AI in Human Resource Management Researcher',aboutHeading:'Bridging Academia & Industry',aboutP1:'I bring together academic preparation in management, a foundation in computer engineering, and hands-on experience in corporate HR. My goal is to connect rigorous research with practical, human-centred approaches to management and the future of work.',aboutP2:'My current academic journey is focused on AI in Human Resource Management, with particular interest in AI adoption, digital readiness, HR analytics, and the evolving relationship between people and technology.',researchHeading:'Research Interests & Focus',researchIntro:'My research explores how organisations can adopt AI responsibly while strengthening human capabilities and HR outcomes.',research1Title:'AI in HRM',research1Text:'AI-driven transformation of human resource management and HR functions.',research2Title:'AI Adoption & Digital Readiness',research2Text:'Understanding organisational enablers, barriers, and readiness for AI adoption.',research3Title:'HR Analytics',research3Text:'Data-driven decision-making and the use of analytics in people management.',research4Title:'Future of Work',research4Text:'Changing workforce models, skills, jobs, and organisational practices.',research5Title:'Human–AI Collaboration',research5Text:'Building effective and responsible synergy between people and intelligent systems.',teachingHeading:'Teaching with Theory, Practice & Relevance',teachingP1:'I aim to create learning experiences that connect management concepts with real organisational situations, current business developments, and evidence-based thinking.',teachingP2:'My teaching interests span Human Resource Management, Organisational Behaviour, Management Principles, HR Analytics, AI in HRM, Research Methodology, and related management subjects.',teachingPhilosophy:'I connect management theory with practical organisational situations, current business developments, discussion, and evidence-based thinking to create relevant and engaging learning experiences.',teachingPhilosophySupport:'My approach emphasises conceptual clarity, practical application, discussion, and responsible use of technology.',subjectsTaught:'Human Resource Management, Management Principles, Organisational Behaviour, Stress Management, Work-Life Balance',subjectsCanTeach:'HR Analytics, AI in HRM, Research Methodology, Data Analysis, Strategic Human Resource Management, Future of Work',qualHeading:'Academic Background',experienceHeading:'Corporate HR Experience',experienceTitle:'Years of Industry Experience',experienceText:'Experience as an HR Generalist in startup environments, bringing practical exposure to people management and organisational processes.',resourcesHeading:'Academic & Professional Resources',resourcesIntro:'A growing collection of research, teaching, presentations, and professional materials.',contactHeading:"Let's Connect",contactIntro:'For academic collaborations, teaching opportunities, research discussions, and professional connections.',footerDescription:'Bridging industry experience with academic research on AI-in-HRM.',footerLocation:'Pune, Maharashtra, India',footerCopyright:'© 2026 Pratiksha Pathak. All rights reserved.',footerTagline:'Designed as an academic & research faculty profile.',footerNavHeading:'NAVIGATE',footerConnectHeading:'CONNECT',footerNavHome:'Home',footerNavResearch:'Research',footerNavQualifications:'Qualifications',footerNavResources:'Resources',footerNavAbout:'About',footerNavTeaching:'Teaching',footerNavExperience:'Experience',footerNavContact:'Contact',email:'your.email@example.com',phone:'+91 XXXXX XXXXX',linkedin:'#',scholar:'#',orcid:'#',teachingLink:'#'};
function get(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {...DEFAULT,...DEFAULT_LISTS,publications:DEFAULT_PUBLICATIONS,teachingItems:DEFAULT_TEACHING_ITEMS,experienceItems:DEFAULT_EXPERIENCE_ITEMS,...saved};
  }catch{return {...DEFAULT,...DEFAULT_LISTS,publications:DEFAULT_PUBLICATIONS,teachingItems:DEFAULT_TEACHING_ITEMS,experienceItems:DEFAULT_EXPERIENCE_ITEMS}}
}
async function getCloudOrLocal(){
  try{
    const cfg=portfolioDB.read();
    if(cfg?.url && cfg?.anonKey){
      const cloud=await portfolioDB.loadContent();
      if(cloud && Object.keys(cloud).length){
        const merged={...DEFAULT,...DEFAULT_LISTS,publications:DEFAULT_PUBLICATIONS,teachingItems:DEFAULT_TEACHING_ITEMS,experienceItems:DEFAULT_EXPERIENCE_ITEMS,...cloud};
        localStorage.setItem(STORAGE_KEY,JSON.stringify(merged));
        return merged;
      }
    }
  }catch(e){console.warn('Cloud load failed; using local content.',e)}
  return get();
}
async function fill(){
  const d=await getCloudOrLocal();
  document.querySelectorAll('[data-field]').forEach(i=>i.value=d[i.dataset.field]??'');
  const selectedTheme=String(d.siteTheme||'current');
  document.querySelectorAll('[data-theme-choice]').forEach(r=>{r.checked=r.value===selectedTheme;});
  const themeField=document.querySelector('[data-field=siteTheme]'); if(themeField) themeField.value=selectedTheme;
  renderListEditor('qualificationsEditor',d.qualifications,'qualification');
  let resources=d.resources||[];
  try{
    const dbResources=await portfolioDB.loadAllResources();
    if(Array.isArray(dbResources) && dbResources.length){
      resources=dbResources.map(r=>({
        id:r.id, icon:r.icon_url||'□', title:r.title, text:r.description,
        label:r.resource_url||r.file_url ? 'Open resource →' : 'View →',
        url:r.resource_url||'', category:r.category||'', fileUrl:r.file_url||'',
        filePath:'', fileName:r.file_url ? decodeURIComponent(r.file_url.split('/').pop().split('?')[0]) : '',
        published:r.published!==false, featured:r.featured===true
      }));
    }
  }catch(e){ console.warn('Could not load resources table; using site content.',e); }
  renderListEditor('resourcesEditor',resources,'resource');
  renderListEditor('teachingFeaturesEditor',d.teachingFeatures.map(text=>({text})), 'feature');
  renderPublicationsEditor(d.publications||DEFAULT_PUBLICATIONS);
  renderTeachingItemsEditor(d.teachingItems||DEFAULT_TEACHING_ITEMS);
  renderPresentationItemsEditor(d.presentationItems||DEFAULT_PRESENTATION_ITEMS);
  renderExperienceItemsEditor(d.experienceItems||DEFAULT_EXPERIENCE_ITEMS);
}
function collectListEditor(id,type){
  const root=document.getElementById(id); if(!root) return [];
  return [...root.querySelectorAll('.list-item')].map(item=>{
    if(type==='qualification') return {
      label:item.querySelector('[data-list="label"]').value,
      title:item.querySelector('[data-list="title"]').value,
      text:item.querySelector('[data-list="text"]').value
    };
    if(type==='resource') return {
      id:item.dataset.resourceId ? Number(item.dataset.resourceId) : null,
      icon:item.querySelector('[data-list="icon"]').value,
      title:item.querySelector('[data-list="title"]').value,
      text:item.querySelector('[data-list="text"]').value,
      label:item.querySelector('[data-list="label"]').value,
      url:item.querySelector('[data-list="url"]').value,
      category:item.querySelector('[data-list="category"]')?.value||'',
      fileUrl:item.dataset.fileUrl||'',
      filePath:item.dataset.filePath||'',
      published:item.querySelector('[data-list="published"]')?.checked!==false,
      featured:!!item.querySelector('[data-list="featured"]')?.checked
    };
    return {text:item.querySelector('[data-list="text"]').value};
  });
}
function renderListEditor(id,items,type){
  const root=document.getElementById(id); if(!root) return;
  root.innerHTML='';
  items.forEach((item,index)=>{
    const div=document.createElement('div'); div.className='list-item';
    if(type==='qualification') div.innerHTML=`
      <div class="list-item-head"><strong>Qualification ${index+1}</strong><button type="button" class="small-btn danger" data-remove>Remove</button></div>
      <div class="grid two">
        <label>Label<input data-list="label" value="${esc(item.label)}"></label>
        <label>Title<input data-list="title" value="${esc(item.title)}"></label>
        <label class="full">Description<textarea data-list="text">${esc(item.text)}</textarea></label>
      </div>`;
    else if(type==='resource') {
      div.dataset.resourceId=item.id||'';
      div.dataset.fileUrl=item.fileUrl||'';
      div.dataset.filePath=item.filePath||'';
      div.innerHTML=`
      <div class="list-item-head">
        <strong>Resource ${index+1}</strong>
        <button type="button" class="small-btn danger" data-remove>Remove</button>
      </div>
      <div class="grid two">
        <label>Icon / symbol<input data-list="icon" value="${esc(item.icon||'□')}" placeholder="▣"></label>
        <label>Title<input data-list="title" value="${esc(item.title||'')}"></label>
        <label>Category<input data-list="category" value="${esc(item.category||'')}" placeholder="Research / Teaching / Academic"></label>
        <label>Button label<input data-list="label" value="${esc(item.label||'View resource →')}"></label>
        <label class="full">Description<textarea data-list="text">${esc(item.text||'')}</textarea></label>
        <label class="full">External link / URL<input data-list="url" value="${esc(item.url||'')}" placeholder="https://..."></label>
        <label class="full">Upload file
          <input type="file" data-resource-file accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.webp">
          <small class="muted resource-file-status">${item.fileUrl ? `Current file: ${esc(item.fileName||'uploaded file')}` : 'Optional. Upload a PDF, presentation, document, image or ZIP.'}</small>
        </label>
        <div class="admin-feature-options">
          <label class="feature-option ${item.featured?'is-on':''}"><input type="checkbox" data-list="featured" ${item.featured?'checked':''}><span><strong>★ Featured resource</strong><small>Show this item in Selected Academic Work.</small></span></label>
          <label class="feature-option ${item.published!==false?'is-on':''}"><input type="checkbox" data-list="published" ${item.published!==false?'checked':''}><span><strong>Publish resource</strong><small>Visible on the public Resources section.</small></span></label>
        </div>
      </div>`;
    }
    else div.innerHTML=`
      <div class="list-item-head"><strong>Teaching point ${index+1}</strong><button type="button" class="small-btn danger" data-remove>Remove</button></div>
      <label>Text<input data-list="text" value="${esc(item.text)}"></label>`;
    div.querySelector('[data-remove]').addEventListener('click',()=>div.remove());
    div.querySelectorAll('.feature-option input').forEach(inp=>inp.addEventListener('change',()=>inp.closest('.feature-option')?.classList.toggle('is-on',inp.checked)));
    root.appendChild(div);
  });
}
function esc(v=''){return String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}

function collectPublications(){
  const root=document.getElementById('publicationsEditor'); if(!root) return [];
  return [...root.querySelectorAll('.publication-admin-item')].map(item=>({
    title:item.querySelector('[data-pub="title"]').value,
    authors:item.querySelector('[data-pub="authors"]').value,
    venue:item.querySelector('[data-pub="venue"]').value,
    year:item.querySelector('[data-pub="year"]').value,
    type:item.querySelector('[data-pub="type"]').value,
    status:item.querySelector('[data-pub="status"]').value,
    category:item.querySelector('[data-pub="category"]')?.value||'',
    abstract:item.querySelector('[data-pub="abstract"]').value,
    keywords:item.querySelector('[data-pub="keywords"]').value,
    doi:item.querySelector('[data-pub="doi"]').value,
    pdf:item.querySelector('[data-pub="pdf"]').value,
    projectUrl:item.querySelector('[data-pub="projectUrl"]')?.value||'',
    featured:!!item.querySelector('[data-pub="featured"]')?.checked,
    published:!!item.querySelector('[data-pub="published"]')?.checked
  }));
}
function renderPublicationsEditor(items){
  const root=document.getElementById('publicationsEditor'); if(!root) return;
  root.innerHTML='';
  items.forEach((p,index)=>{
    const div=document.createElement('div');div.className='publication-admin-item';
    div.innerHTML=`
      <div class="list-item-head"><strong>Research Item ${index+1}</strong><button type="button" class="small-btn danger" data-remove>Remove</button></div>
      <div class="grid two">
        <label class="full">Title<input data-pub="title" value="${esc(p.title)}"></label>
        <label>Authors<input data-pub="authors" value="${esc(p.authors)}"></label>
        <label>Journal / Conference / Project venue<input data-pub="venue" value="${esc(p.venue)}"></label>
        <label>Year<input data-pub="year" value="${esc(p.year)}"></label>
        <label>Research type<select data-pub="type">
          ${['Journal Article','Review Article','Systematic Literature Review','Conference Paper','Book Chapter','Working Paper','Research Project','Other'].map(x=>`<option ${x===p.type?'selected':''}>${x}</option>`).join('')}
        </select></label>
        <label>Status<select data-pub="status">
          ${['Published','Under Review','Working Paper','Ongoing','Completed'].map(x=>`<option ${x===p.status?'selected':''}>${x}</option>`).join('')}
        </select></label>
        <label>Research category<input data-pub="category" value="${esc(p.category||'')}" placeholder="AI in HRM, AI Adoption, HR Analytics"></label>
        <label>Keywords<input data-pub="keywords" value="${esc(p.keywords)}" placeholder="Comma-separated keywords"></label>
        <label class="full">Abstract / Short description<textarea data-pub="abstract">${esc(p.abstract)}</textarea></label>
        <label>DOI / Publication URL<input data-pub="doi" value="${esc(p.doi)}" placeholder="https://doi.org/..."></label>
        <label>PDF / Full-text URL<input data-pub="pdf" value="${esc(p.pdf)}" placeholder="https://..."></label>
        <label>Research project URL<input data-pub="projectUrl" value="${esc(p.projectUrl||'')}" placeholder="Optional project page / repository URL"></label>
        <div class="admin-feature-options">
          <label class="feature-option ${p.featured===true||String(p.featured).toLowerCase()==='true'?'is-on':''}"><input type="checkbox" data-pub="featured" ${p.featured===true||String(p.featured).toLowerCase()==='true'?'checked':''}><span><strong>★ Featured research</strong><small>Show this item in Selected Academic Work.</small></span></label>
          <label class="feature-option ${p.published!==false?'is-on':''}"><input type="checkbox" data-pub="published" ${p.published!==false?'checked':''}><span><strong>Publish research</strong><small>Visible on the public Research page.</small></span></label>
        </div>
      </div>`;
    div.querySelector('[data-remove]').addEventListener('click',()=>div.remove());
    root.appendChild(div);
  });
}


function collectTeachingItems(){
  const root=document.getElementById('teachingItemsEditor'); if(!root) return [];
  return [...root.querySelectorAll('.teaching-admin-item')].map(item=>({
    title:item.querySelector('[data-teach="title"]').value,
    type:item.querySelector('[data-teach="type"]').value,
    category:item.querySelector('[data-teach="category"]')?.value||'',
    subjects:item.querySelector('[data-teach="subjects"]')?.value||'',
    description:item.querySelector('[data-teach="description"]').value,
    tags:item.querySelector('[data-teach="tags"]').value,
    url:item.querySelector('[data-teach="url"]').value,
    featured:!!item.querySelector('[data-teach="featured"]')?.checked,
    published:!!item.querySelector('[data-teach="published"]')?.checked
  }));
}
function renderTeachingItemsEditor(items){
  const root=document.getElementById('teachingItemsEditor'); if(!root) return;
  root.innerHTML='';
  items.forEach((p,index)=>{
    const div=document.createElement('div');div.className='teaching-admin-item';
    div.innerHTML=`
      <div class="list-item-head"><strong>Teaching Resource ${index+1}</strong><button type="button" class="small-btn danger" data-remove>Remove</button></div>
      <div class="grid two">
        <label class="full">Title<input data-teach="title" value="${esc(p.title)}"></label>
        <label>Type<select data-teach="type">
          ${['Demo Lecture','Academic Lecture','Teaching Video','Teaching Resource','Course Resource','Workshop','Other'].map(x=>`<option ${x===p.type?'selected':''}>${x}</option>`).join('')}
        </select></label>
        <label>Teaching category<input data-teach="category" value="${esc(p.category||'')}" placeholder="HRM / AI & HRM / Research Methods"></label>
        <label>Subjects covered<input data-teach="subjects" value="${esc(p.subjects||'')}" placeholder="Comma-separated subjects"></label>
        <label>Topics / Tags<input data-teach="tags" value="${esc(p.tags)}" placeholder="AI, HRM, Research Methods"></label>
        <label class="full">Description<textarea data-teach="description">${esc(p.description)}</textarea></label>
        <label class="full">Video / Resource URL<input data-teach="url" value="${esc(p.url||'')}" placeholder="https://youtube.com/..."></label>
        <div class="admin-feature-options">
          <label class="feature-option ${p.featured?'is-on':''}"><input type="checkbox" data-teach="featured" ${p.featured?'checked':''}><span><strong>★ Featured teaching</strong><small>Show this item in Selected Academic Work.</small></span></label>
          <label class="feature-option ${p.published!==false?'is-on':''}"><input type="checkbox" data-teach="published" ${p.published!==false?'checked':''}><span><strong>Publish teaching resource</strong><small>Visible on the public Teaching page.</small></span></label>
        </div>
      </div>`;
    div.querySelector('[data-remove]').addEventListener('click',()=>div.remove());
    root.appendChild(div);
  });
}



function collectPresentationItems(){
  const root=document.getElementById('presentationItemsEditor'); if(!root) return [];
  return [...root.querySelectorAll('.presentation-admin-item')].map(item=>({
    title:item.querySelector('[data-pres="title"]').value,
    type:item.querySelector('[data-pres="type"]').value,
    description:item.querySelector('[data-pres="description"]').value,
    tags:item.querySelector('[data-pres="tags"]').value,
    url:item.querySelector('[data-pres="url"]').value,
    fileUrl:item.dataset.fileUrl||'',
    fileName:item.dataset.fileName||'',
    thumbnailUrl:item.dataset.thumbnailUrl||'',
    thumbnailName:item.dataset.thumbnailName||'',
    featured:!!item.querySelector('[data-pres="featured"]')?.checked,
    published:item.querySelector('[data-pres="published"]').checked
  }));
}
function renderPresentationItemsEditor(items){
  const root=document.getElementById('presentationItemsEditor'); if(!root) return;
  root.innerHTML='';
  (items||[]).forEach((p,index)=>{
    const div=document.createElement('div');
    div.className='presentation-admin-item list-item';
    div.dataset.fileUrl=p.fileUrl||'';
    div.dataset.fileName=p.fileName||'';
    div.dataset.thumbnailUrl=p.thumbnailUrl||'';
    div.dataset.thumbnailName=p.thumbnailName||'';
    div.innerHTML=`
      <div class="list-item-head"><strong>Presentation ${index+1}</strong><button type="button" class="small-btn danger" data-remove>Remove</button></div>
      <div class="grid two">
        <label class="full">Title<input data-pres="title" value="${esc(p.title||'')}"></label>
        <label>Type<input data-pres="type" value="${esc(p.type||'Presentation')}"></label>
        <label>Tags / topics<input data-pres="tags" value="${esc(p.tags||'')}" placeholder="AI, HRM, Research"></label>
        <label class="full">Description<textarea data-pres="description">${esc(p.description||'')}</textarea></label>
        <label class="full">Presentation URL<input data-pres="url" value="${esc(p.url||'')}" placeholder="https://..."></label>
        <label class="full">Upload presentation
          <input type="file" data-presentation-file accept=".pdf,.ppt,.pptx">
          <small class="muted presentation-file-status">${p.fileUrl ? `Current file: ${esc(p.fileName||'uploaded presentation')}` : 'Optional. PDF, PPT or PPTX.'}</small>
        </label>
        <label class="full">Thumbnail image (recommended)
          <input type="file" data-presentation-thumbnail accept="image/png,image/jpeg,image/webp">
          <small class="muted presentation-thumbnail-status">${p.thumbnailUrl ? `Current thumbnail: ${esc(p.thumbnailName||'uploaded image')}` : 'Optional. JPG, PNG or WebP. Recommended 16:9 image.'}</small>
        </label>
        <div class="admin-feature-options">
          <label class="feature-option ${p.featured?'is-on':''}"><input type="checkbox" data-pres="featured" ${p.featured?'checked':''}><span><strong>★ Featured presentation</strong><small>Show this item in Selected Academic Work.</small></span></label>
          <label class="feature-option ${p.published!==false?'is-on':''}"><input type="checkbox" data-pres="published" ${p.published!==false?'checked':''}><span><strong>Publish presentation</strong><small>Visible on the public Presentations page.</small></span></label>
        </div>
      </div>`;
    div.querySelector('[data-remove]').addEventListener('click',()=>div.remove());
    root.appendChild(div);
  });
}
function collectExperienceItems(){
  const root=document.getElementById('experienceItemsEditor'); if(!root) return [];
  return [...root.querySelectorAll('.experience-admin-item')].map(item=>({
    role:item.querySelector('[data-exp="role"]').value,
    company:item.querySelector('[data-exp="company"]').value,
    location:item.querySelector('[data-exp="location"]').value,
    start:item.querySelector('[data-exp="start"]').value,
    end:item.querySelector('[data-exp="end"]').value,
    type:item.querySelector('[data-exp="type"]').value,
    description:item.querySelector('[data-exp="description"]').value,
    details:item.querySelector('[data-exp="details"]').value,
    achievements:item.querySelector('[data-exp="achievements"]').value
  }));
}
function renderExperienceItemsEditor(items){
  const root=document.getElementById('experienceItemsEditor'); if(!root) return;
  root.innerHTML='';
  items.forEach((x,index)=>{
    const div=document.createElement('div');div.className='experience-admin-item';
    div.innerHTML=`
      <div class="list-item-head"><strong>Experience ${index+1}</strong><button type="button" class="small-btn danger" data-remove>Remove</button></div>
      <div class="grid two">
        <label>Job title / role<input data-exp="role" value="${esc(x.role)}"></label>
        <label>Organisation / company<input data-exp="company" value="${esc(x.company)}"></label>
        <label>Location<input data-exp="location" value="${esc(x.location)}"></label>
        <label>Employment type<input data-exp="type" value="${esc(x.type)}" placeholder="Full-time / Internship / Consulting"></label>
        <label>Start date<input data-exp="start" value="${esc(x.start)}" placeholder="Oct 2022"></label>
        <label>End date<input data-exp="end" value="${esc(x.end)}" placeholder="May 2025 / Present"></label>
        <label class="full">Role overview<textarea data-exp="description">${esc(x.description)}</textarea></label>
        <label class="full">Responsibilities / details<textarea data-exp="details" placeholder="Separate each point with |">${esc(x.details)}</textarea></label>
        <label class="full">Key achievement / contribution<textarea data-exp="achievements">${esc(x.achievements)}</textarea></label>
      </div>`;
    div.querySelector('[data-remove]').addEventListener('click',()=>div.remove());
    root.appendChild(div);
  });
}

async function syncResourcesToDatabase(resources){
  const cfg=portfolioDB.read();
  if(!cfg?.url || !cfg?.anonKey) return;

  const prepared=[];
  for(const item of resources){
    const row={...item};
    const domItem=[...document.querySelectorAll('#resourcesEditor .list-item')].find(el=>
      String(el.dataset.resourceId||'')===String(item.id||'') ||
      (!item.id && !el.dataset.resourceId && el.querySelector('[data-list="title"]')?.value===item.title)
    );
    const file=domItem?.querySelector('[data-resource-file]')?.files?.[0];
    if(file){
      const allowed=[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip','application/x-zip-compressed',
        'image/png','image/jpeg','image/webp'
      ];
      const uploaded=await uploadPortfolioFile(file,'resources',allowed,25*1024*1024);
      row.fileUrl=uploaded.url;
      if(domItem){
        domItem.dataset.fileUrl=uploaded.url;
        domItem.dataset.filePath=uploaded.path;
        const note=domItem.querySelector('.resource-file-status');
        if(note) note.textContent=`Uploaded: ${file.name}`;
      }
    }
    prepared.push(row);
  }

  const rows=prepared.map((r,i)=>({
    id:r.id||null,
    title:r.title||'Untitled resource',
    description:r.text||'',
    category:r.category||'',
    resource_url:r.url||'',
    file_url:r.fileUrl||'',
    icon_url:r.icon||'□',
    sort_order:i,
    published:r.published!==false,
    featured:r.featured===true
  }));

  // Reconcile the table with the current dashboard list.
  // Resource files themselves remain in Storage so replacing content never
  // breaks an already-published URL.
  await portfolioDB.deleteResourcesExcept([]);
  await portfolioDB.upsertResources(rows);
}


async function loadInquiries(){
  const root=document.getElementById('inquiriesList'); if(!root) return;
  const summary=document.getElementById('inquirySummary');
  try{
    const rows=await portfolioDB.loadContactInquiries();
    const unread=rows.filter(r=>r.status==='new').length;
    if(summary) summary.textContent=`${rows.length} enquiries · ${unread} new`;
    if(!rows.length){root.innerHTML='<div class="library-empty"><strong>No enquiries yet.</strong><span>Messages submitted from the public contact form will appear here.</span></div>';return;}
    root.innerHTML=rows.map(r=>`<article class="inquiry-card ${r.status==='new'?'is-new':''}" data-inquiry-id="${r.id}"><div class="inquiry-head"><div><span class="inquiry-category">${esc(r.category||'General enquiry')}</span><h3>${esc(r.subject||'No subject')}</h3></div><span class="inquiry-date">${esc(new Date(r.created_at).toLocaleString('en-IN'))}</span></div><div class="inquiry-meta"><strong>${esc(r.name)}</strong> · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a></div><p>${esc(r.message)}</p><div class="inquiry-actions"><select data-inquiry-status><option value="new" ${r.status==='new'?'selected':''}>New</option><option value="read" ${r.status==='read'?'selected':''}>Read</option><option value="replied" ${r.status==='replied'?'selected':''}>Replied</option><option value="archived" ${r.status==='archived'?'selected':''}>Archived</option></select><button type="button" class="small-btn danger" data-delete-inquiry>Delete</button></div></article>`).join('');
    root.querySelectorAll('[data-inquiry-status]').forEach(sel=>sel.addEventListener('change',async()=>{const id=Number(sel.closest('[data-inquiry-id]').dataset.inquiryId);try{await portfolioDB.updateContactInquiry(id,{status:sel.value});await loadInquiries();}catch(e){alert('Could not update enquiry: '+(e.message||e));}}));
    root.querySelectorAll('[data-delete-inquiry]').forEach(btn=>btn.addEventListener('click',async()=>{const id=Number(btn.closest('[data-inquiry-id]').dataset.inquiryId);if(!confirm('Delete this enquiry permanently?'))return;try{await portfolioDB.deleteContactInquiry(id);await loadInquiries();}catch(e){alert('Could not delete enquiry: '+(e.message||e));}}));
  }catch(e){root.innerHTML=`<div class="library-empty"><strong>Could not load enquiries.</strong><span>${esc(e.message||e)}</span></div>`;}
}

async function save(){
  const d=get();
  const chosenTheme=document.querySelector('[data-theme-choice]:checked')?.value || d.siteTheme || 'current';
  d.siteTheme=['current','coralNavy','emeraldGold'].includes(chosenTheme)?chosenTheme:'current';
  document.querySelectorAll('[data-field]').forEach(i=>{if(i.dataset.field!=='siteTheme') d[i.dataset.field]=i.value;});
  d.qualifications=collectListEditor('qualificationsEditor','qualification');
  d.resources=collectListEditor('resourcesEditor','resource');
  d.teachingFeatures=collectListEditor('teachingFeaturesEditor','feature');
  d.publications=collectPublications();
  d.teachingItems=collectTeachingItems();
  d.presentationItems=collectPresentationItems();
  for(const item of d.presentationItems){
    const dom=[...document.querySelectorAll('#presentationItemsEditor .presentation-admin-item')]
      .find(el=>el.querySelector('[data-pres="title"]')?.value===item.title);
    const file=dom?.querySelector('[data-presentation-file]')?.files?.[0];
    if(file){
      const allowed=['application/pdf','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      const uploaded=await uploadPortfolioFile(file,'presentations',allowed,30*1024*1024);
      item.fileUrl=uploaded.url; item.fileName=uploaded.name; item.url=uploaded.url;
      if(dom){dom.dataset.fileUrl=uploaded.url;dom.dataset.fileName=uploaded.name;const note=dom.querySelector('.presentation-file-status');if(note)note.textContent=`Uploaded: ${file.name}`;}
    }
    const thumbnail=dom?.querySelector('[data-presentation-thumbnail]')?.files?.[0];
    if(thumbnail){
      if(!thumbnail.type.startsWith('image/')) throw new Error('Presentation thumbnail must be an image.');
      const previousPath=dom?.dataset.thumbnailPath||'';
      const uploadedThumb=await uploadPortfolioFile(thumbnail,'presentation-thumbnails',['image/png','image/jpeg','image/webp'],5*1024*1024);
      if(previousPath) await deletePortfolioFile(previousPath);
      item.thumbnailUrl=uploadedThumb.url; item.thumbnailName=uploadedThumb.name;
      if(dom){dom.dataset.thumbnailUrl=uploadedThumb.url;dom.dataset.thumbnailName=uploadedThumb.name;dom.dataset.thumbnailPath=uploadedThumb.path;const note=dom.querySelector('.presentation-thumbnail-status');if(note)note.textContent=`Uploaded: ${thumbnail.name}`;}
    }
  }

  d.experienceItems=collectExperienceItems();

  localStorage.setItem(STORAGE_KEY,JSON.stringify(d));

  try{
    const cfg=portfolioDB.read();
    if(cfg?.url && cfg?.anonKey){
      await syncResourcesToDatabase(d.resources);
      await portfolioDB.saveContent(d);
      status('Changes saved to the online database.','ok');
      return;
    }
  }catch(e){
    status('Saved locally, but online database save failed: '+(e.message||e),'warn');
    return;
  }
  status('Changes saved locally. Connect Supabase in Database to make them online.','ok');
}

function status(msg,type='ok'){const s=document.getElementById('status');s.textContent=msg;s.className=`status ${type}`;clearTimeout(window.statusTimer);window.statusTimer=setTimeout(()=>s.className='status',3500)}

document.querySelectorAll('[data-theme-choice]').forEach(r=>r.addEventListener('change',()=>{const f=document.querySelector('[data-field=siteTheme]');if(f)f.value=r.value;}));

const loginForm=document.getElementById('loginForm');
async function showAdmin(){
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('adminView').classList.remove('hidden');
  await fill();
}
async function bootstrapAuth(){
  const cfg=portfolioDB.read();
  if(cfg?.url && cfg?.anonKey){
    try{
      const s=await portfolioDB.session();
      if(s){
        const admin=await portfolioDB.isAdmin();
        if(admin) await showAdmin();
        else {await portfolioDB.signOut();}
      }
    }catch(e){console.warn('Supabase auth bootstrap failed',e)}
  }else if(sessionStorage.getItem('portfolioAdminAuth')==='1') await showAdmin();
}
bootstrapAuth();
if(loginForm){
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=document.getElementById('username').value.trim();
    const p=document.getElementById('password').value;
    const err=document.getElementById('loginError');
    if(err) err.textContent='';
    const cfg=portfolioDB.read();
    if(cfg?.url && cfg?.anonKey){
      try{
        const {error}=await portfolioDB.signIn(email,p);
        if(error) throw error;
        if(!(await portfolioDB.isAdmin())){await portfolioDB.signOut();throw new Error('This account is not registered as a portfolio administrator yet.');}
        await showAdmin();
      }catch(e){if(err) err.textContent=e.message||'Unable to sign in.';}
    }else{
      if(email==='admin' && p==='admin123'){
        sessionStorage.setItem('portfolioAdminAuth','1'); await showAdmin();
      }else if(err) err.textContent='Supabase is not connected. For local testing use admin / admin123.';
    }
  });
}

document.querySelectorAll('.side-link').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.side-link').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active')}));
document.getElementById('saveBtn').addEventListener('click',save);
document.getElementById('logoutBtn').addEventListener('click',async()=>{sessionStorage.removeItem('portfolioAdminAuth');try{await portfolioDB.signOut()}catch(e){} location.reload()});
document.getElementById('resetBtn').addEventListener('click',async()=>{if(confirm('Reset all editable content to the demo placeholders?')){localStorage.removeItem(STORAGE_KEY);await fill();status('Demo content restored locally. Click Save changes to apply it online.','warn')}});

document.getElementById('addQualification')?.addEventListener('click',()=>{
  const root=document.getElementById('qualificationsEditor');
  const n=root.querySelectorAll('.list-item').length+1;
  renderListEditor('qualificationsEditor',[...collectListEditor('qualificationsEditor','qualification'),{label:'QUALIFICATION',title:`New Qualification ${n}`,text:'Add details here.'}],'qualification');
});
document.getElementById('addResource')?.addEventListener('click',()=>{
  const root=document.getElementById('resourcesEditor');
  const n=root.querySelectorAll('.list-item').length+1;
  renderListEditor('resourcesEditor',[...collectListEditor('resourcesEditor','resource'),{
    id:null,icon:'□',title:`New Resource ${n}`,text:'Add a short description.',
    label:'Open resource →',url:'',category:'Academic',fileUrl:'',filePath:'',published:true
  }],'resource');
});
document.getElementById('addTeachingFeature')?.addEventListener('click',()=>{
  const root=document.getElementById('teachingFeaturesEditor');
  const current=collectListEditor('teachingFeaturesEditor','feature');
  current.push({text:'New teaching point'});
  renderListEditor('teachingFeaturesEditor',current,'feature');
});
document.getElementById('profileImageInput')?.addEventListener('change',e=>{
  const file=e.target.files?.[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>document.getElementById('imagePreview').src=reader.result;
  reader.readAsDataURL(file);
});

document.getElementById('addPublication')?.addEventListener('click',()=>{
  const root=document.getElementById('publicationsEditor');
  const current=collectPublications();
  current.push({title:'New research item',authors:'Author details',venue:'Journal / Conference / Project',year:'2026',type:'Journal Article',status:'Working Paper',category:'',abstract:'Add a concise abstract or description.',keywords:'',doi:'',pdf:'',projectUrl:'',featured:false,published:true});
  renderPublicationsEditor(current);
});

document.getElementById('addPresentationItem')?.addEventListener('click',()=>{
  const current=collectPresentationItems();
  current.push({title:'New presentation',type:'Presentation',description:'Add a short description.',tags:'',url:'#',fileUrl:'',fileName:'',thumbnailUrl:'',thumbnailName:'',featured:false,published:true});
  renderPresentationItemsEditor(current);
});
document.getElementById('addTeachingItem')?.addEventListener('click',()=>{
  const current=collectTeachingItems();
  current.push({title:'New teaching resource',type:'Teaching Video',category:'',subjects:'',description:'Add a short description.',tags:'',url:'#',featured:false,published:true});
  renderTeachingItemsEditor(current);
});

document.getElementById('addExperience')?.addEventListener('click',()=>{
  const current=collectExperienceItems();
  current.push({role:'New role',company:'Organisation',location:'',start:'',end:'Present',type:'Full-time',description:'Add a short role overview.',details:'Add responsibility 1|Add responsibility 2',achievements:''});
  renderExperienceItemsEditor(current);
});

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('[data-tab="inquiries"]')?.addEventListener('click',()=>loadInquiries());
  document.getElementById('refreshInquiries')?.addEventListener('click',()=>loadInquiries());
});
