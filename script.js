
/* V16 Public Cloud Media — Supabase Storage */
const MEDIA_SECTION='media';
function getLocalMediaSnapshot(){
  try{
    const local=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const media=local?.[MEDIA_SECTION]||{};
    // Support both the current media.siteLogo shape and older logo keys.
    return {...media,siteLogo:{...(media.siteLogo||{}),...(local.siteLogo||{}),...(local.logo||{})}};
  }catch(e){ return {}; }
}

async function getCloudMediaPublic(){
  // V45: merge cloud + local content instead of allowing an incomplete cloud
  // media object to erase a valid local/embedded logo copy.
  const localMedia=getLocalMediaSnapshot();
  let cloudMedia={};
  try{
    const content=await portfolioDB.loadContent();
    cloudMedia=content?.[MEDIA_SECTION] || {};
  }catch(e){
    console.warn('Logo/media cloud read unavailable; using local fallback.', e);
  }
  const cloudLogo=cloudMedia.siteLogo||cloudMedia.logo||{};
  const localLogo=localMedia.siteLogo||{};
  return {
    ...localMedia,
    ...cloudMedia,
    siteLogo:{...localLogo,...cloudLogo}
  };
}

function isEnabledFlag(value, fallback=true){
  if(value===undefined || value===null || value==='') return fallback;
  if(typeof value==='string') return !['false','0','no','off'].includes(value.trim().toLowerCase());
  return !!value;
}

function normalizePublicLink(key,value){
  let v=String(value||'').trim();
  if(!v) return '#';
  if(key==='email') return v.startsWith('mailto:') ? v : `mailto:${v}`;
  if(key==='phone') return v.startsWith('tel:') ? v : `tel:${v.replace(/[^+\d]/g,'')}`;
  if(key==='scholar'){
    if(/^scholar\.google\./i.test(v)) v='https://'+v;
    if(/^google\.com\/citations/i.test(v)) v='https://scholar.'+v;
    if(/^[A-Za-z0-9_-]{6,}$/.test(v)) v=`https://scholar.google.com/citations?user=${encodeURIComponent(v)}`;
  }
  if(/^www\./i.test(v)) v='https://'+v;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(v)) v='https://'+v;
  return v;
}

async function renderFooterSocials(){
  const content=await portfolioDB.loadContent();
  const media=content?.[MEDIA_SECTION] || {};
  const root=content || {};
  const saved=media.footerSocials || {};
  const container=document.getElementById('footerSocialLinks');
  if(!container) return;
  const order=['email','linkedin','scholar','orcid'];
  const fallbackIcons={email:'✉',linkedin:'in',scholar:'🎓',orcid:'iD'};
  container.innerHTML='';
  order.forEach(key=>{
    const d=saved[key] || {label:key==='linkedin'?'LinkedIn':key==='scholar'?'Google Scholar':key==='orcid'?'ORCID':'Gmail',url:root[key]||'',enabled:true,icon:''};
    const rawUrl=d.url || root[key] || '';
    if(!isEnabledFlag(d.enabled,true) || !rawUrl) return;
    const a=document.createElement('a');
    a.className='footer-social-link';
    a.href=normalizePublicLink(key,rawUrl);
    if(key!=='email' && key!=='phone') { a.target='_blank'; a.rel='noopener noreferrer'; }
    a.setAttribute('aria-label',d.label||key); a.title=d.label||key;
    if(d.icon){
      const img=document.createElement('img'); img.src=cloudAssetUrl(d.icon,d.iconVersion||'1'); img.alt=''; a.appendChild(img);
    }else{
      const span=document.createElement('span'); span.className='footer-social-fallback'; span.textContent=fallbackIcons[key]||'●'; a.appendChild(span);
    }
    container.appendChild(a);
  });
}

function absolutePublicUrl(value, fallback=''){
  const v=String(value||fallback||'').trim();
  if(!v) return '';
  try{return new URL(v, document.baseURI).href;}catch{return v;}
}
const THEMES={current:{label:'Current Academic',className:'theme-current'},coralNavy:{label:'Coral & Navy',className:'theme-coral-navy'},emeraldGold:{label:'Emerald & Gold',className:'theme-emerald-gold'}};
function applySiteTheme(content){
  const theme=String(content?.siteTheme||'current');
  const valid=THEMES[theme]?theme:'current';
  document.documentElement.dataset.siteTheme=valid;
  document.body?.setAttribute('data-site-theme',valid);
  document.querySelectorAll('[data-theme-name]').forEach(el=>el.textContent=THEMES[valid].label);
}

function applySeoAndSchema(content){
  const c=content||{};
  const title=String(c.seoTitle||'Pratiksha Pathak | Academic Portfolio').trim();
  const description=String(c.seoDescription||'Academic and professional portfolio of Pratiksha Pathak — HR Professional, Researcher and UGC NET (Management).').trim();
  const configured=String(c.siteUrl||'').trim().replace(/\/$/,'');
  const siteUrl=configured || (location.protocol==='http:'||location.protocol==='https:' ? location.origin : '');
  const canonical=siteUrl ? `${siteUrl}/` : '';
  const image=absolutePublicUrl(c.ogImage || 'assets/og-preview.png');
  document.title=title;
  const desc=document.querySelector('meta[name="description"]'); if(desc) desc.content=description;
  const keywords=document.querySelector('meta[name="keywords"]'); if(keywords) keywords.content=String(c.seoKeywords||'AI in HRM, Human Resource Management, Management, Researcher, UGC NET, HR Analytics');
  const author=document.querySelector('meta[name="author"]'); if(author) author.content=`${c.heroFirstName||'Pratiksha'} ${c.heroLastName||'Pathak'}`;
  const canonicalEl=document.getElementById('canonicalUrl'); if(canonicalEl && canonical) canonicalEl.href=canonical;
  const set=(sel,val)=>{const el=document.querySelector(sel);if(el)el.setAttribute('content',val)};
  set('meta[property="og:title"]',title); set('meta[property="og:description"]',description); set('meta[property="og:url"]',canonical); set('meta[property="og:image"]',image);
  set('meta[name="twitter:title"]',title); set('meta[name="twitter:description"]',description); set('meta[name="twitter:image"]',image);
  const sameAs=['linkedin','scholar','orcid'].map(k=>normalizePublicLink(k,c[k]||'')).filter(v=>v && v!=='#' && /^https?:/i.test(v));
  const personName=`${c.heroFirstName||'Pratiksha'} ${c.heroLastName||'Pathak'}`;
  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'Person','@id':canonical?`${canonical}#person`:undefined,name:personName,url:canonical||undefined,jobTitle:'HR Professional and Researcher',description:description,sameAs:sameAs,image:image},
      {'@type':'WebSite','@id':canonical?`${canonical}#website`:undefined,url:canonical||undefined,name:title,description:description,author:{'@id':canonical?`${canonical}#person`:undefined}}
    ]
  };
  const node=document.getElementById('structuredData'); if(node) node.textContent=JSON.stringify(schema);
}

async function renderMediaPublic(){
  const media=await getCloudMediaPublic();
  const logo=media.siteLogo || media.logo || {};
  const img=document.getElementById('siteLogoImg');
  const name=document.querySelector('[data-site-brand-text]');
  const brand=document.querySelector('.site-header .brand');

  // Resolve all supported saved representations. Embedded data is first so
  // the header does not depend on Storage being publicly readable.
  const embeddedLogo=typeof logo.dataUrl==='string' && logo.dataUrl.startsWith('data:image/') ? logo.dataUrl : '';
  let logoUrl=logo.url || logo.publicUrl || logo.fileUrl || '';
  try{
    if(!logoUrl && logo.path && portfolioDB.publicUrl){
      const storageUrl=portfolioDB.publicUrl(MEDIA_BUCKET,logo.path);
      if(storageUrl) logoUrl=storageUrl;
    }
  }catch(e){}
  // A locally cached embedded copy is useful when Storage/CDN is temporarily unavailable.
  const cachedLogo=typeof logo.cachedDataUrl==='string' && logo.cachedDataUrl.startsWith('data:image/') ? logo.cachedDataUrl : '';
  const effectiveEmbeddedLogo=embeddedLogo || cachedLogo;
  // V44: saved logos are visible by default. Hiding is an explicit opt-out.
  const shouldShowLogo=!!(effectiveEmbeddedLogo || logoUrl) && isEnabledFlag(logo.enabled,true);
  const hideName=shouldShowLogo && isEnabledFlag(logo.hideName,false);

  if(brand) brand.classList.toggle('logo-only',hideName);
  if(!img) return;

  img.dataset.logoFallbackTried='0';
  img.onerror=()=>{
    console.warn('Portfolio logo source failed; falling back safely.');
    // If the embedded copy failed, try the Storage/public URL once.
    if(effectiveEmbeddedLogo && logoUrl && img.dataset.logoFallbackTried!=='1'){
      img.dataset.logoFallbackTried='1';
      img.src=cloudAssetUrl(logoUrl,logo.version||logo.updatedAt||Date.now());
      return;
    }
    // Last-resort built-in mark. This is not presented as the uploaded logo.
    if(img.dataset.logoFallbackTried!=='2'){
      img.dataset.logoFallbackTried='2';
      img.src='assets/favicon.svg';
      img.hidden=false;
      img.style.display='block';
      if(name) name.hidden=hideName;
      return;
    }
    img.hidden=true;
    img.style.display='none';
    img.removeAttribute('src');
    if(name) name.hidden=false;
    if(brand) brand.classList.remove('logo-only');
  };

  if(shouldShowLogo){
    img.alt=logo.alt||'Pratiksha Pathak logo';
    img.hidden=false;
    img.style.display='block';
    img.style.visibility='visible';
    img.style.opacity='1';
    img.setAttribute('aria-hidden','false');
    if(name) name.hidden=hideName;
    img.src=effectiveEmbeddedLogo || cloudAssetUrl(logoUrl,logo.version||logo.updatedAt||Date.now());
    img.dataset.logoResolved='1';
  }else{
    img.hidden=true;
    img.style.display='none';
    img.removeAttribute('src');
    img.setAttribute('aria-hidden','true');
    if(name) name.hidden=false;
    if(brand) brand.classList.remove('logo-only');
  }

  const cv=media.academicCvPdf || media.cvPdf;
  document.querySelectorAll('[data-cv-download]').forEach(el=>{
    if(cv?.url){el.href=cv.url; el.target='_blank'; el.download=cv.name||'Pratiksha_Pathak_Academic_CV.pdf'; el.classList.remove('disabled-link'); el.title='Download Academic CV';}
    else {el.href='#resources'; el.removeAttribute('target'); el.removeAttribute('download'); el.classList.add('disabled-link'); el.title='Upload your CV from Admin → Photo & Media';}
  });
  const profile=media.profilePhoto;
  const portrait=document.querySelector('.portrait-card > img');
  if(profile?.url && portrait){portrait.src=profile.url; portrait.alt=profile.alt||'Professional portrait of Pratiksha Pathak';}
}

const nav=document.querySelector('.nav');
const menuToggle=document.querySelector('.menu-toggle');
const navLinks=document.querySelectorAll('.nav-link');
const sections=document.querySelectorAll('main section[id]');
const STORAGE_KEY='pratikshaPortfolioContentV1';

const DEFAULT_CONTENT={
  siteTheme:'current',
  seoTitle:'Pratiksha Pathak | Academic Portfolio',siteUrl:'',seoDescription:'Academic and professional portfolio of Pratiksha Pathak — HR Professional, Researcher and UGC NET (Management).',ogImage:'',seoKeywords:'AI in HRM, Human Resource Management, Management, Researcher, UGC NET, HR Analytics',
  heroEyebrow:'WELCOME TO MY PORTFOLIO',heroFirstName:'Pratiksha',heroLastName:'Pathak',
  heroTitle:'HR Professional | Researcher | UGC NET (Management)',
  heroText:'Exploring the intersection of Artificial Intelligence, Human Resource Management, and the future of work to create meaningful impact through research, teaching, and practice.',
  heroResearchCta:'Explore My Research →',heroTeachingCta:'Teaching Portfolio →',heroCvCta:'Download CV ↓',cvLabel:'Download CV',
  portraitLabel:'RESEARCHING',portraitTitle:'AI in Human Resource Management Researcher',
  aboutHeading:'Bridging Academia & Industry',
  aboutP1:'I bring together academic preparation in management, a foundation in computer engineering, and hands-on experience in corporate HR. My goal is to connect rigorous research with practical, human-centred approaches to management and the future of work.',
  aboutP2:'My current academic journey is focused on AI in Human Resource Management, with particular interest in AI adoption, digital readiness, HR analytics, and the evolving relationship between people and technology.',
  researchHeading:'Research Interests & Focus',researchIntro:'My research explores how organisations can adopt AI responsibly while strengthening human capabilities and HR outcomes.',
  research1Title:'AI in HRM',research1Text:'AI-driven transformation of human resource management and HR functions.',research2Title:'AI Adoption & Digital Readiness',research2Text:'Understanding organisational enablers, barriers, and readiness for AI adoption.',research3Title:'HR Analytics',research3Text:'Data-driven decision-making and the use of analytics in people management.',research4Title:'Future of Work',research4Text:'Changing workforce models, skills, jobs, and organisational practices.',research5Title:'Human–AI Collaboration',research5Text:'Building effective and responsible synergy between people and intelligent systems.',
  teachingHeading:'Teaching with Theory, Practice & Relevance',teachingP1:'I aim to create learning experiences that connect management concepts with real organisational situations, current business developments, and evidence-based thinking.',teachingP2:'My teaching interests span Human Resource Management, Organisational Behaviour, Management Principles, HR Analytics, AI in HRM, Research Methodology, and related management subjects.',teachingPhilosophy:'I connect management theory with practical organisational situations, current business developments, discussion, and evidence-based thinking to create relevant and engaging learning experiences.',teachingPhilosophySupport:'My approach emphasises conceptual clarity, practical application, discussion, and responsible use of technology.',subjectsTaught:'Human Resource Management, Management Principles, Organisational Behaviour, Stress Management, Work-Life Balance',subjectsCanTeach:'HR Analytics, AI in HRM, Research Methodology, Data Analysis, Strategic Human Resource Management, Future of Work',
  qualHeading:'Academic Background',experienceHeading:'Corporate HR Experience',experienceTitle:'Years of Industry Experience',experienceText:'Experience as an HR Generalist in startup environments, bringing practical exposure to people management and organisational processes.',
  resourcesHeading:'Academic & Professional Resources',resourcesIntro:'A growing collection of research, teaching, presentations, and professional materials.',contactHeading:"Let's Connect",contactIntro:'For academic collaborations, teaching opportunities, research discussions, and professional connections.',
  footerDescription:'Bridging industry experience with academic research on AI-in-HRM.',footerLocation:'Pune, Maharashtra, India',footerCopyright:'© 2026 Pratiksha Pathak. All rights reserved.',footerTagline:'Designed as an academic & research faculty profile.',footerNavHeading:'NAVIGATE',footerConnectHeading:'CONNECT',
  footerNavHome:'Home',footerNavResearch:'Research',footerNavQualifications:'Qualifications',footerNavResources:'Resources',footerNavAbout:'About',footerNavTeaching:'Teaching',footerNavExperience:'Experience',footerNavContact:'Contact',

  publications:[
    {title:'Barriers to AI Adoption in Human Resource Functions',authors:'Author details to be added',venue:'Target journal / publication venue',year:'2026',type:'Review Article',status:'Working Paper',category:'AI Adoption, HRM',abstract:'Narrative review examining technological, organizational, human, ethical, privacy, trust, and governance barriers to AI adoption in HR functions.',keywords:'AI, HRM, AI adoption, barriers',doi:'',pdf:'',projectUrl:'',featured:false,published:true},
    {title:'Artificial Intelligence in Human Resource Management: Research Trends, Emerging Themes, and Future Directions',authors:'Author details to be added',venue:'Target journal / publication venue',year:'2026',type:'Systematic Literature Review',status:'Working Paper',category:'AI in HRM, Research Trends',abstract:'Review of research trends, emerging themes, and future directions in AI-enabled human resource management.',keywords:'Artificial Intelligence, Human Resource Management, research trends',doi:'',pdf:'',projectUrl:'',featured:false,published:true}
  ],

  teachingItems:[
    {title:'Demo Lecture: Stress Management & Work-Life Balance',type:'Demo Lecture',category:'HRM',subjects:'Human Resource Management, Stress Management, Work-Life Balance',description:'Sample academic lecture for management and HRM learners.',tags:'HRM, Stress Management, Work-Life Balance',url:'#'},
    {title:'AI in Human Resource Management',type:'Academic Lecture',category:'AI & HRM',subjects:'AI in HRM, HR Analytics, Human Resource Management',description:'Planned teaching resource on AI applications across the HR lifecycle.',tags:'AI, HRM, HR Analytics',url:'#'},
    {title:'Research Methodology & Data Analysis',type:'Teaching Resource',category:'Research Methods',subjects:'Research Methodology, Data Analysis, SPSS',description:'Planned resource covering research design, variables, sampling and analysis.',tags:'Research Methods, SPSS, Data Analysis',url:'#'}
  ],
  experienceItems:[
    {role:'HR Generalist',company:'Startup / Organisation',location:'Pune, Maharashtra, India',start:'Month 20XX',end:'Month 20XX',type:'Full-time',description:'Managed day-to-day HR operations and employee lifecycle activities in a startup environment.',details:'Recruitment and onboarding|Employee engagement and HR operations|HR documentation and coordination|Employee lifecycle support',achievements:'Add measurable achievements, projects, or impact here.'}
  ],
  email:'your.email@example.com',phone:'+91 XXXXX XXXXX',linkedin:'#',scholar:'#',orcid:'#',
  qualifications:[
   {label:'CURRENT',title:'PhD — AI in Human Resource Management',text:'Department of Commerce & Management, Swami Ramanand Teerth Marathwada University, Nanded.'},
   {label:'QUALIFICATION',title:'UGC NET — Management',text:'Qualified National Eligibility Test in Management.'},
   {label:'POSTGRADUATE',title:'MBA — Human Resource Management',text:'Indira Institute of Management Sciences, Nanded.'},
   {label:'UNDERGRADUATE',title:'BE — Computer Engineering',text:'MBES College of Engineering, Ambajogai.'}
  ],
  resources:[
   {icon:'▤',title:'Academic CV',text:'Research, teaching, qualifications, and academic profile.',label:'Download Academic CV →',url:'#'},
   {icon:'▣',title:'Professional Resume',text:'Corporate HR experience, skills, projects, and professional profile.',label:'Download Professional Resume →',url:'#'},
   {icon:'◫',title:'Research Papers',text:'Publications, manuscripts, and research work.',label:'Explore research →',url:'#research'},
   {icon:'▣',title:'Teaching Videos',text:'Demo lectures and academic video resources.',label:'Explore teaching →',url:'#teaching'},
   {icon:'□',title:'Presentations',text:'Academic presentations and professional materials.',label:'Coming soon →',url:'#'}
  ],
  teachingFeatures:[
   {text:'Conceptual clarity through structured explanations'},
   {text:'Case-based and real-world learning'},
   {text:'Technology-enabled and data-informed teaching'},
   {text:'Demo lectures and academic video resources'}
  ]
};

let CLOUD_CONTENT=null;
function getContent(){
  try{
    return normalizeCloudContent({...DEFAULT_CONTENT,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'),...(CLOUD_CONTENT||{})});
  }catch{
    return normalizeCloudContent({...DEFAULT_CONTENT,...(CLOUD_CONTENT||{})});
  }
}
async function loadCloudContent(){
  const cfg=portfolioDB.read();
  if(!cfg?.url||!cfg?.anonKey)return;
  let cloud=null;
  try{
    cloud=await portfolioDB.loadContent();
    CLOUD_CONTENT=normalizeCloudContent(cloud||{});
    applySiteTheme(CLOUD_CONTENT);
    applySeoAndSchema(CLOUD_CONTENT);
    const media=CLOUD_CONTENT.media||{};
    const socials=media.footerSocials||{};
    ['email','linkedin','scholar','orcid'].forEach(k=>{ if(socials[k]?.url) CLOUD_CONTENT[k]=socials[k].url; });
  }catch(e){
    console.warn('Public site content unavailable; using local content.',e);
    return;
  }

  // Render the normal content immediately. Media/logo is handled separately
  // below so a resources-table issue can never prevent the logo from loading.
  renderContent();

  try{
    const resources=await portfolioDB.loadResources();
    if(Array.isArray(resources)){
      CLOUD_CONTENT.resources=resources.map(r=>({
        icon:r.icon_url||'□', title:r.title, text:r.description,
        label:r.resource_url||r.file_url ? 'Open resource →' : 'View →',
        url:r.resource_url||r.file_url||'#', category:r.category||'', featured:r.featured===true, published:r.published!==false
      }));
    }
    const media=CLOUD_CONTENT.media||{};
    CLOUD_CONTENT.presentationItems=Array.isArray(CLOUD_CONTENT.presentationItems)?CLOUD_CONTENT.presentationItems:[];
    const academic=media.academicCvPdf||media.cvPdf;
    const resume=media.corporateResumePdf;
    let list=Array.isArray(CLOUD_CONTENT.resources)?[...CLOUD_CONTENT.resources]:[];
    if(academic?.url) list=list.filter(x=>String(x.title||'').trim().toLowerCase()!=='curriculum vitae');
    const ensureMediaResource=(title,description,icon,file)=>{
      if(!file?.url) return;
      const idx=list.findIndex(x=>String(x.title||'').trim().toLowerCase()===title.toLowerCase());
      const item={icon,title,text:description,label:'Open resource →',url:file.url,category:title==='Academic CV'?'Academic':'Professional'};
      if(idx>=0) list[idx]=item; else list.unshift(item);
    };
  
    list=list.map(x=>String(x.title||'').trim().toLowerCase()==='presentations'
      ? {...x,url:'#presentations',label:'Explore presentations →',text:'Academic presentations and professional materials.',category:'Academic'}
      : x);
    CLOUD_CONTENT.resources=list;
    renderContent();
  }catch(e){
    console.warn('Resources table unavailable; using site content resources.',e);
    renderContent();
  }

  // Always load media independently and force a fresh logo URL after cloud content.
  try{ await renderMediaPublic(); }catch(e){ console.warn('Public media render failed.',e); }
  try{ await renderFooterSocials(); }catch(e){ console.warn('Public footer links render failed.',e); }
  setTimeout(()=>renderMediaPublic().catch(()=>{}),250);
}


/* V32 — Public cloud-data normalization + scalable content libraries */
const PUBLIC_LIBRARY_LIMIT = 6;

function parseStoredValue(value, depth=0){
  if(depth>4 || value==null) return value;
  if(typeof value === 'string'){
    const s=value.trim();
    if(!s) return value;
    try { return parseStoredValue(JSON.parse(s), depth+1); } catch(e){ return value; }
  }
  if(Array.isArray(value)) return value.map(v=>parseStoredValue(v, depth+1));
  if(typeof value === 'object'){
    const out={};
    Object.entries(value).forEach(([k,v])=>out[k]=parseStoredValue(v, depth+1));
    return out;
  }
  return value;
}
function collectionFromStored(value){
  const v=parseStoredValue(value);
  if(Array.isArray(v)) return v;
  if(!v || typeof v!=='object') return [];
  for(const key of ['items','data','rows','entries','list','results','records']){
    if(Array.isArray(v[key])) return v[key];
    if(v[key] && typeof v[key]==='object') {
      const nested=collectionFromStored(v[key]);
      if(nested.length) return nested;
    }
  }
  const values=Object.values(v);
  if(values.length && values.every(x=>x && typeof x==='object' && !Array.isArray(x))) return values;
  return [];
}
function normalizeCloudContent(raw){
  const parsed=parseStoredValue(raw);
  let source=parsed;
  if(source && typeof source==='object' && source.content && typeof source.content==='object' && !Array.isArray(source.content)){
    source={...source,...source.content};
  }
  if(!source || typeof source!=='object') return {};
  const out={...source};
  const aliases={
    qualifications:['qualificationItems','qualification','qualificationsData'],
    experienceItems:['experience','experiences','experienceData','workExperience','workExperienceItems'],
    teachingItems:['teaching','teachingVideos','teachingResources','teachingData'],
    publications:['research','researchPapers','researchItems','publicationsData'],
    presentationItems:['presentations','presentation','presentationData','presentationResources'],
    resources:['resourceItems','resourcesData']
  };
  Object.entries(aliases).forEach(([canonical,names])=>{
    if(Array.isArray(out[canonical])) return;
    for(const name of names){
      if(out[name]!==undefined){
        const list=collectionFromStored(out[name]);
        if(list.length || out[name]==='[]'){ out[canonical]=list; break; }
      }
    }
    if(out[canonical]!==undefined && !Array.isArray(out[canonical])){
      out[canonical]=collectionFromStored(out[canonical]);
    }
  });
  ['qualifications','experienceItems','teachingItems','publications','presentationItems','resources'].forEach(k=>{
    if(out[k]!==undefined && !Array.isArray(out[k])) out[k]=collectionFromStored(out[k]);
  });
  return out;
}
function ensureLibraryControls(grid){
  if(!grid) return null;
  let controls=grid.parentElement?.querySelector(`[data-library-controls="${grid.id}"]`);
  if(!controls){
    controls=document.createElement('div');
    controls.className='library-controls';
    controls.dataset.libraryControls=grid.id;
    controls.innerHTML=`<button type="button" class="library-toggle" data-library-toggle="${grid.id}" hidden></button>`;
    grid.insertAdjacentElement('afterend',controls);
  }
  return controls;
}
function renderLimitedLibrary(grid, rows, cardRenderer, emptyHtml){
  if(!grid) return;
  const controls=ensureLibraryControls(grid);
  const toggle=controls?.querySelector('.library-toggle');
  const expanded=grid.dataset.expanded==='true';
  const visible=expanded ? rows : rows.slice(0,PUBLIC_LIBRARY_LIMIT);
  grid.innerHTML=rows.length ? visible.map(cardRenderer).join('') : emptyHtml;
  if(controls && toggle){
    if(rows.length>PUBLIC_LIBRARY_LIMIT){
      controls.hidden=false;
      toggle.hidden=false;
      toggle.textContent=expanded ? 'Show fewer ↑' : `Show all ${rows.length} ↓`;
      toggle.onclick=()=>{
        grid.dataset.expanded=expanded?'false':'true';
        // Re-render through the section-specific function so current filters/search remain applied.
        if(grid.id==='publicTeachingGrid') renderPublicTeaching(getContent());
        else if(grid.id==='publicResearchGrid') renderPublicResearch(getContent());
        else if(grid.id==='publicPresentationsGrid') renderPublicPresentations(getContent());
        else if(grid.id==='publicResourcesGrid') renderListSections(getContent());
      };
    }else{
      controls.hidden=true;
      toggle.hidden=true;
      grid.dataset.expanded='false';
    }
  }
}

function renderListSections(data){
  const q=document.querySelector('.timeline');
  if(q && Array.isArray(data.qualifications)){
    q.innerHTML=data.qualifications.map((x,i)=>`<article><div class="timeline-marker">${String(i+1).padStart(2,'0')}</div><div><p class="timeline-label">${escapeHtml(x.label)}</p><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p></div></article>`).join('');
  }
  const r=document.querySelector('.resource-grid');
  if(r && Array.isArray(data.resources)){
    r.id='publicResourcesGrid';
    renderLimitedLibrary(r,data.resources,(x,i)=>`
      <a class="resource-card" href="${escapeAttr(x.url||'#')}" data-resource-index="${i}" ${x.url&&x.url!=='#'&&!String(x.url).startsWith('#')?'target="_blank" rel="noopener"':''}>
        <div class="resource-icon">${escapeHtml(x.icon||'□')}</div>
        ${x.category?`<span class="resource-category">${escapeHtml(x.category)}</span>`:''}
        <h3>${escapeHtml(x.title)}</h3>
        <p>${escapeHtml(x.text)}</p>
        <span class="resource-link">${escapeHtml(x.label||'Open resource →')}</span>
      </a>`,
      '<div class="teaching-empty">Resources will be added here.</div>');
  }
  const t=document.querySelector('.feature-list');
  if(t && Array.isArray(data.teachingFeatures)){
    t.innerHTML=data.teachingFeatures.map((x,i)=>`<div><strong>${String(i+1).padStart(2,'0')}</strong><span>${escapeHtml(x.text||x)}</span></div>`).join('');
  }
}
function renderPublicPresentations(data){
  const grid=document.getElementById('publicPresentationsGrid');
  if(!grid) return;
  const items=Array.isArray(data.presentationItems)?data.presentationItems.filter(x=>x.published!==false):[];
  const active=document.querySelector('.presentation-filter.active')?.dataset.filter || 'All';
  const query=(document.getElementById('presentationSearch')?.value || '').trim().toLowerCase();
  const rows=items.filter(x=>{
    const category=String(x.category||'').toLowerCase();
    const type=String(x.type||'').toLowerCase();
    const combined=`${category} ${type}`;
    const matchesFilter=active==='All' || combined.includes(active.toLowerCase());
    const hay=[x.title,x.description,x.tags,x.category,x.type,x.year,x.fileName].join(' ').toLowerCase();
    return matchesFilter && (!query || hay.includes(query));
  });
  const countEl=document.getElementById('presentationResultCount');
  if(countEl) countEl.textContent=`Showing ${rows.length} of ${items.length} presentation${items.length===1?'':'s'}`;
  renderLimitedLibrary(grid,rows,x=>{
    const href=x.fileUrl || x.url || '#';
    const tags=String(x.tags||'').split(',').map(t=>t.trim()).filter(Boolean).slice(0,4);
    const thumb=x.thumbnailUrl||x.thumbnail||'';
    return `<article class="presentation-card">
      <div class="presentation-cover ${thumb?'has-presentation-thumbnail':''}" ${thumb?`style="background-image:linear-gradient(rgba(6,17,31,.10),rgba(6,17,31,.52)),url('${escapeAttr(thumb)}')"`:''}>${thumb?'':'<div class="presentation-cover-icon">▱</div>'}<span>${escapeHtml(x.type||x.category||'Presentation')}</span></div>
      <div class="presentation-card-body">
        ${x.featured?'<span class="content-featured-badge">★ FEATURED</span>':''}<h3>${escapeHtml(x.title||'Presentation')}</h3>
        <p>${escapeHtml(x.description||'')}</p>
        ${tags.length?`<div class="presentation-tags">${tags.map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`:''}
        <a class="presentation-link ${href==='#'?'disabled-presentation-link':''}" href="${escapeAttr(href)}" ${href!=='#'?'target="_blank" rel="noopener"':''}>${href!=='#'?'Open Presentation ↗':'Coming soon →'}</a>
      </div>
    </article>`;
  },'<div class="presentation-empty">No presentations match your search or filter.</div>');
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('.presentation-filter');
  if(!btn) return;
  document.querySelectorAll('.presentation-filter').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  const grid=document.getElementById('publicPresentationsGrid');
  if(grid) grid.dataset.expanded='false';
  renderPublicPresentations(getContent());
});
document.getElementById('presentationSearch')?.addEventListener('input',()=>{
  const grid=document.getElementById('publicPresentationsGrid');
  if(grid) grid.dataset.expanded='false';
  renderPublicPresentations(getContent());
});

function renderPublicExperience(data){
  const e=document.getElementById('publicExperienceGrid');
  if(!e || !Array.isArray(data.experienceItems)) return;
  if(!data.experienceItems.length){
    e.innerHTML='<div class="no-publications">Professional experience will be added here.</div>';
    return;
  }
  e.innerHTML=data.experienceItems.map(x=>`
    <article class="experience-item">
      <div class="experience-period">${escapeHtml(x.start||'')}<br>—<br>${escapeHtml(x.end||'')}</div>
      <div class="experience-content">
        <h3>${escapeHtml(x.role||'Professional Role')}</h3>
        <p class="experience-company">${escapeHtml(x.company||'Organisation')}${x.location?` • ${escapeHtml(x.location)}`:''}</p>
        ${x.type?`<div class="experience-meta"><span>${escapeHtml(x.type)}</span></div>`:''}
        <p class="experience-description">${escapeHtml(x.description||'')}</p>
        ${x.details?`<ul class="experience-details">${String(x.details).split('|').map(d=>d.trim()).filter(Boolean).map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul>`:''}
        ${x.achievements?`<div class="experience-achievements"><strong>Key contribution / achievement:</strong> ${escapeHtml(x.achievements)}</div>`:''}
      </div>
    </article>`).join('');
}


function normalizePresentationResource(x){
  if(!x) return null;
  const title = x.title || x.name || 'Presentation';
  const description = x.description || '';
  const category = x.category || 'Presentation';
  const url = x.url || x.fileUrl || x.link || '';
  const fileName = x.fileName || x.file_name || '';
  return {
    ...x,
    title,
    description,
    category,
    url,
    fileName,
    published: x.published !== false
  };
}

function cloudAssetUrl(url,version){
  if(!url) return '';
  // Supabase public Storage URLs are cacheable. A small version token ensures
  // a replaced logo is visible immediately after saving.
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version || window.portfolioAssetVersion || '1')}`;
}

function escapeHtml(v=''){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
function countPublished(items){
  return Array.isArray(items) ? items.filter(x=>x && x.published!==false).length : 0;
}
function renderAcademicSnapshot(data){
  const grid=document.getElementById('academicSnapshotGrid');
  if(!grid) return;
  const items=[
    {value:countPublished(data.publications),label:'Research outputs',hint:'Papers, manuscripts & reviews',href:'#research'},
    {value:countPublished(data.teachingItems),label:'Teaching resources',hint:'Lectures & academic videos',href:'#teaching'},
    {value:countPublished(data.presentationItems),label:'Presentations',hint:'Academic & professional material',href:'#presentations'},
    {value:Array.isArray(data.qualifications)?data.qualifications.length:0,label:'Qualifications',hint:'Academic credentials',href:'#qualifications'},
    {value:Array.isArray(data.experienceItems)?data.experienceItems.length:0,label:'Experience entries',hint:'Industry & professional journey',href:'#experience'},
    {value:countPublished(data.resources),label:'Resources',hint:'CVs, papers & academic material',href:'#resources'}
  ];
  grid.innerHTML=items.map((x,i)=>`<a class="snapshot-card" href="${x.href}"><strong>${String(i+1).padStart(2,'0')}</strong><span>${escapeHtml(x.label)}</span><small>${escapeHtml(x.hint)} · ${x.value===1?'1 item':x.value+' items'} →</small></a>`).join('');
}
function getFeaturedItem(items){
  const rows=Array.isArray(items)?items.filter(x=>x && x.published!==false):[];
  return rows.find(x=>x.featured===true || String(x.featured).toLowerCase()==='true') || null;
}
function renderFeaturedContent(data){
  const grid=document.getElementById('featuredContentGrid');
  if(!grid) return;
  const research=getFeaturedItem(data.publications);
  const teaching=getFeaturedItem(data.teachingItems);
  const presentation=getFeaturedItem(data.presentationItems);
  const resource=getFeaturedItem(data.resources);
  const cards=[];
  if(research){
    cards.push(`<article class="featured-card featured-research"><div class="featured-visual"><span class="featured-icon">▤</span><span class="featured-label">FEATURED RESEARCH</span></div><div class="featured-body"><span class="featured-kicker">${escapeHtml(research.status||research.type||'Research')}</span><h3>${escapeHtml(research.title||'Research work')}</h3><p>${escapeHtml(research.abstract||research.description||'Research publication or manuscript.')}</p><a href="#research" class="featured-link">Explore research →</a></div></article>`);
  }
  if(teaching){
    const yt=getYouTubeId(teaching.url||'');
    const thumb=yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : '';
    cards.push(`<article class="featured-card featured-teaching"><div class="featured-visual ${thumb?'has-featured-thumb':''}" ${thumb?`style="background-image:linear-gradient(rgba(6,17,31,.10),rgba(6,17,31,.58)),url('${escapeAttr(thumb)}')"`:''}><span class="featured-icon">▶</span><span class="featured-label">FEATURED TEACHING</span></div><div class="featured-body"><span class="featured-kicker">${escapeHtml(teaching.type||'Teaching resource')}</span><h3>${escapeHtml(teaching.title||'Teaching resource')}</h3><p>${escapeHtml(teaching.description||'Academic teaching resource.')}</p><a href="#teaching" class="featured-link">View teaching portfolio →</a></div></article>`);
  }
  if(presentation){
    const thumb=presentation.thumbnailUrl||presentation.thumbnail||'';
    cards.push(`<article class="featured-card featured-presentation"><div class="featured-visual ${thumb?'has-featured-thumb':''}" ${thumb?`style="background-image:linear-gradient(rgba(6,17,31,.10),rgba(6,17,31,.58)),url('${escapeAttr(thumb)}')"`:''}><span class="featured-icon">▱</span><span class="featured-label">FEATURED PRESENTATION</span></div><div class="featured-body"><span class="featured-kicker">${escapeHtml(presentation.category||presentation.type||'Presentation')}</span><h3>${escapeHtml(presentation.title||'Presentation')}</h3><p>${escapeHtml(presentation.description||'Academic or professional presentation.')}</p><a href="#presentations" class="featured-link">View presentations →</a></div></article>`);
  }
  if(resource){
    cards.push(`<article class="featured-card featured-resource"><div class="featured-visual"><span class="featured-icon">□</span><span class="featured-label">FEATURED RESOURCE</span></div><div class="featured-body"><span class="featured-kicker">${escapeHtml(resource.category||'Academic resource')}</span><h3>${escapeHtml(resource.title||'Academic resource')}</h3><p>${escapeHtml(resource.text||resource.description||'Academic or professional resource.')}</p><a href="${escapeAttr(resource.url||resource.fileUrl||'#resources')}" class="featured-link" ${resource.url||resource.fileUrl?'target="_blank" rel="noopener noreferrer"':''}>Open resource →</a></div></article>`);
  }
  grid.innerHTML=cards.length?cards.join(''):'<div class="featured-empty">Featured academic work will appear here as content is added.</div>';
}
function escapeAttr(v=''){return String(v).replaceAll('"','&quot;').replaceAll('<','%3C').replaceAll('>','%3E')}
function renderContent(){
  const data=getContent();
  applySiteTheme(data);
  renderListSections(data);
  renderAcademicSnapshot(data);
  renderFeaturedContent(data);
  renderPublicResearch(data);
  renderPublicTeaching(data);
  renderTeachingProfile(data);
  renderPublicPresentations(data);
  renderPublicExperience(data);
  document.querySelectorAll('[data-key]').forEach(el=>{const key=el.dataset.key;if(data[key]!==undefined){if(key==='heroTitle'){const parts=data[key].split('|').map(x=>x.trim());el.innerHTML=parts.map((p,i)=>i<parts.length-1?`${p} <span>|</span> `:p).join('');}else if(key==='heroResearchCta'||key==='heroTeachingCta'||key==='heroCvCta'){el.innerHTML=`${data[key].replace(/[→↓]\s*$/,'').trim()} <span>${key==='heroCvCta'?'↓':'→'}</span>`}else el.textContent=data[key]}});
  document.querySelectorAll('[data-link-key]').forEach(el=>{
    const key=el.dataset.linkKey;
    const value=String(data[key]||'').trim();
    el.href=normalizePublicLink(key,value);
    // Contact cards contain both the clickable destination and visible value.
    if(key==='email' && el.matches('a')) el.textContent=value || 'Email';
    else if(key==='phone' && el.matches('a')) el.textContent=value || 'Mobile';
    else if(key==='linkedin' && el.matches('a') && value && value!=='#') el.textContent='LinkedIn profile →';
  });
  const title=document.querySelector('title');if(title) title.textContent=`${data.heroFirstName} ${data.heroLastName} | Academic Portfolio`;
}
renderContent();
renderMediaPublic();
renderFooterSocials();
loadCloudContent();

document.addEventListener('click',e=>{
  const card=e.target.closest('.resource-card');
  if(card){
    const href=card.getAttribute('href')||'#';
    if(href==='#' || href.trim()===''){
      e.preventDefault();
      const item=getContent().resources[Number(card.dataset.resourceIndex)]||{};
      const modal=document.getElementById('resourceModal');
      if(modal){
        document.getElementById('resourceModalTitle').textContent=item.title||'Resource';
        document.getElementById('resourceModalText').textContent='This resource is not published yet. Add a URL or upload a file from Admin → Resources, then publish it.';
        modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
      }
    }
  }
  if(e.target.closest('[data-close-resource]')){
    const modal=document.getElementById('resourceModal');
    if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') document.getElementById('resourceModal')?.classList.remove('open');
});


if(menuToggle){menuToggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',open);});}
navLinks.forEach(link=>link.addEventListener('click',()=>nav.classList.remove('open')));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')===`#${entry.target.id}`));}),{rootMargin:'-30% 0px -60% 0px',threshold:0});sections.forEach(section=>observer.observe(section));}

/* V37 Research Portfolio Pro */
function getResearchCategories(items){
  const values=[];
  (items||[]).forEach(x=>splitList(x.category||x.keywords).slice(0,3).forEach(v=>{
    const c=v.trim(); if(c && c.length<42 && !values.some(a=>a.toLowerCase()===c.toLowerCase())) values.push(c);
  }));
  return values.sort((a,b)=>a.localeCompare(b));
}
function getResearchTypes(items){
  const values=[]; (items||[]).forEach(x=>{const t=String(x.type||'Research').trim(); if(t&&!values.some(a=>a.toLowerCase()===t.toLowerCase())) values.push(t);});
  return values.sort((a,b)=>a.localeCompare(b));
}
function renderResearchFilters(items){
  const filters=document.getElementById('researchFilters');
  const type=document.getElementById('researchTypeFilter');
  const active=filters?.querySelector('.research-filter.active')?.dataset.filter||'All';
  if(filters){
    const cats=getResearchCategories(items);
    filters.innerHTML=['All',...cats].map(x=>`<button type="button" class="research-filter ${x===active?'active':''}" data-filter="${escapeAttr(x)}">${escapeHtml(x==='All'?'All':x)}</button>`).join('');
  }
  if(type){
    const current=type.value; const types=getResearchTypes(items);
    type.innerHTML='<option value="All">All research types</option>'+types.map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join('');
    type.value=types.some(x=>x===current)?current:'All';
  }
}
function renderFeaturedResearch(data){
  const panel=document.getElementById('featuredResearchPanel'); if(!panel) return;
  const rows=(Array.isArray(data.publications)?data.publications:[]).filter(x=>x&&x.published!==false);
  const featured=rows.find(x=>x.featured===true||String(x.featured).toLowerCase()==='true');
  if(!featured){panel.hidden=true;panel.innerHTML='';return;}
  panel.hidden=false;
  panel.innerHTML=`<div class="research-featured-copy"><span class="profile-card-kicker">FEATURED RESEARCH</span><h3>${escapeHtml(featured.title||'Featured research')}</h3><p class="research-featured-meta">${escapeHtml(featured.authors||'')} ${featured.year?'• '+escapeHtml(featured.year):''} ${featured.venue?'• '+escapeHtml(featured.venue):''}</p><p>${escapeHtml(featured.abstract||featured.description||'Selected research output.')}</p><div class="publication-links">${featured.doi?`<a href="${escapeAttr(featured.doi)}" target="_blank" rel="noopener">DOI ↗</a>`:''}${featured.pdf?`<a href="${escapeAttr(featured.pdf)}" target="_blank" rel="noopener">Full text ↗</a>`:''}</div></div><span class="featured-research-mark">★</span>`;
}
function renderPublicResearch(data){
  const grid=document.getElementById('publicResearchGrid');
  if(!grid) return;
  const items=Array.isArray(data.publications)?data.publications.filter(x=>x&&x.published!==false):[];
  renderResearchFilters(items); renderFeaturedResearch(data);
  const active=document.querySelector('.research-filter.active')?.dataset.filter||'All';
  const type=document.getElementById('researchTypeFilter')?.value||'All';
  const query=(document.getElementById('researchSearch')?.value||'').trim().toLowerCase();
  const rows=items.filter(p=>{
    const category=String(p.category||'').toLowerCase();
    const keywordCats=splitList(p.category||p.keywords).map(x=>x.toLowerCase());
    const matchesCategory=active==='All'||category===active.toLowerCase()||keywordCats.includes(active.toLowerCase());
    const matchesType=type==='All'||String(p.type||'').toLowerCase()===type.toLowerCase();
    const hay=[p.title,p.authors,p.venue,p.year,p.type,p.status,p.category,p.abstract,p.keywords,p.doi].join(' ').toLowerCase();
    return matchesCategory&&matchesType&&(!query||hay.includes(query));
  });
  const countEl=document.getElementById('researchResultCount'); if(countEl) countEl.textContent=`Showing ${rows.length} of ${items.length} research item${items.length===1?'':'s'}`;
  renderLimitedLibrary(grid,rows,p=>`
    <article class="publication-card research-hover-card">
      <div class="publication-cover">${p.featured?'<span class="publication-featured-badge">★ FEATURED</span>':''}<div class="publication-cover-icon">${String(p.type||'').toLowerCase()==='research project'?'◈':'▤'}</div><span>${escapeHtml(p.type||'Research')}</span></div>
      <div class="publication-card-body">
        <div class="publication-meta"><span>${escapeHtml(p.type||'Research')}</span><span>•</span><span>${escapeHtml(p.year||'')}</span><span class="publication-status">${escapeHtml(p.status||'Working Paper')}</span></div>
        ${p.category?`<span class="publication-category">${escapeHtml(p.category)}</span>`:''}
        <h3>${escapeHtml(p.title||'Untitled research')}</h3>
        <p class="publication-authors">${escapeHtml(p.authors||'Author information to be added')}</p>
        <p><strong>${escapeHtml(p.venue||'Journal / Conference / Project')}</strong></p>
        <p>${escapeHtml(p.abstract||'Abstract / short description to be added.')}</p>
        <div class="publication-links">${p.doi?`<a href="${escapeAttr(p.doi)}" target="_blank" rel="noopener">DOI ↗</a>`:''}${p.pdf?`<a href="${escapeAttr(p.pdf)}" target="_blank" rel="noopener">Full text ↗</a>`:''}${p.projectUrl?`<a href="${escapeAttr(p.projectUrl)}" target="_blank" rel="noopener">Project ↗</a>`:''}</div>
      </div>
    </article>`, '<div class="no-publications">No research items match your search or filters.</div>');
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('.research-filter'); if(!btn) return;
  document.querySelectorAll('.research-filter').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
  const grid=document.getElementById('publicResearchGrid'); if(grid) grid.dataset.expanded='false'; renderPublicResearch(getContent());
});
document.getElementById('researchSearch')?.addEventListener('input',()=>{const grid=document.getElementById('publicResearchGrid');if(grid)grid.dataset.expanded='false';renderPublicResearch(getContent());});
document.getElementById('researchTypeFilter')?.addEventListener('change',()=>{const grid=document.getElementById('publicResearchGrid');if(grid)grid.dataset.expanded='false';renderPublicResearch(getContent());});

/* V8 Teaching Manager */
function getYouTubeId(url='') {
  const m=String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}
function splitList(value){
  return String(value||'').split(/[,|]/).map(x=>x.trim()).filter(Boolean);
}
function renderTeachingProfile(data){
  const ph=document.querySelector('[data-key="teachingPhilosophy"]');
  if(ph) ph.textContent=data.teachingPhilosophy||'I connect management theory with practical organisational situations, current business developments, discussion, and evidence-based thinking.';
  const support=document.querySelector('[data-key="teachingPhilosophySupport"]');
  if(support) support.textContent=data.teachingPhilosophySupport||'My approach emphasises conceptual clarity, practical application, discussion, and responsible use of technology.';
  const renderChips=(id,value)=>{
    const el=document.getElementById(id); if(!el) return;
    const items=splitList(value);
    el.innerHTML=items.length ? items.map(x=>`<span>${escapeHtml(x)}</span>`).join('') : '<span class="subject-empty">Add subjects from Admin → Teaching.</span>';
  };
  renderChips('subjectsTaughtList',data.subjectsTaught);
  renderChips('subjectsCanTeachList',data.subjectsCanTeach);
}
function getTeachingCategories(items){
  const values=[];
  items.forEach(x=>{
    const candidates=[x.category, x.type];
    candidates.forEach(raw=>{
      const c=String(raw||'').trim();
      if(c && !/^(teaching video|teaching resource|other)$/i.test(c) && !values.some(v=>v.toLowerCase()===c.toLowerCase())) values.push(c);
    });
  });
  return values.sort((a,b)=>a.localeCompare(b));
}
function getTeachingSubjects(items){
  const values=[];
  items.forEach(x=>{
    splitList(x.subjects||x.tags).forEach(c=>{ if(!values.some(v=>v.toLowerCase()===c.toLowerCase())) values.push(c); });
  });
  return values.sort((a,b)=>a.localeCompare(b));
}
function renderTeachingFilters(items){
  const cats=document.getElementById('teachingFilters');
  const subject=document.getElementById('teachingSubjectFilter');
  const active=cats?.querySelector('.teaching-filter.active')?.dataset.filter || 'All';
  if(cats){
    const categories=getTeachingCategories(items);
    cats.innerHTML=['All',...categories].map(x=>`<button class="teaching-filter ${x===active?'active':''}" data-filter="${escapeAttr(x)}" type="button">${escapeHtml(x==='All'?'All':x)}</button>`).join('');
  }
  if(subject){
    const current=subject.value;
    subject.innerHTML='<option value="All">All subjects</option>'+getTeachingSubjects(items).map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join('');
    subject.value=getTeachingSubjects(items).some(x=>x===current)?current:'All';
  }
}
function openTeachingVideo(id,title){
  const modal=document.getElementById('teachingVideoModal');
  const frame=document.getElementById('teachingVideoFrame');
  const heading=document.getElementById('teachingVideoModalTitle');
  const fallback=document.getElementById('youtubeLocalFallback');
  const fallbackLink=document.getElementById('youtubeFallbackLink');
  if(!modal) return;
  if(heading) heading.textContent=title||'Teaching video';
  const watchUrl=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  if(fallbackLink) fallbackLink.href=watchUrl;
  const isLocal=window.location.protocol==='file:';
  if(frame){
    frame.src=isLocal ? '' : `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
    frame.hidden=isLocal;
  }
  if(fallback) fallback.hidden=!isLocal;
  modal.setAttribute('aria-hidden','false'); modal.classList.add('open'); document.body.classList.add('modal-open');
}
function closeTeachingVideo(){
  const modal=document.getElementById('teachingVideoModal'); const frame=document.getElementById('teachingVideoFrame');
  if(frame){frame.src='';frame.hidden=false;}
  const fallback=document.getElementById('youtubeLocalFallback'); if(fallback) fallback.hidden=true;
  if(modal){modal.setAttribute('aria-hidden','true');modal.classList.remove('open');}
  document.body.classList.remove('modal-open');
}
function renderPublicTeaching(data){
  const grid=document.getElementById('publicTeachingGrid');
  if(!grid) return;
  const items=Array.isArray(data.teachingItems) ? data.teachingItems.filter(x=>x.published!==false) : [];
  renderTeachingFilters(items);
  const active=document.querySelector('.teaching-filter.active')?.dataset.filter || 'All';
  const subject=document.getElementById('teachingSubjectFilter')?.value || 'All';
  const query=(document.getElementById('teachingSearch')?.value || '').trim().toLowerCase();
  const rows=items.filter(x=>{
    const category=String(x.category||x.type||'').toLowerCase();
    const matchesCategory=active==='All' || category===active.toLowerCase() || String(x.type||'').toLowerCase()===active.toLowerCase();
    const subjectHay=splitList(x.subjects||x.tags).join(' ').toLowerCase();
    const matchesSubject=subject==='All' || splitList(x.subjects||x.tags).some(v=>v.toLowerCase()===subject.toLowerCase());
    const hay=[x.title,x.type,x.category,x.subjects,x.description,x.tags].join(' ').toLowerCase();
    return matchesCategory && matchesSubject && (!query || hay.includes(query));
  });
  const countEl=document.getElementById('teachingResultCount');
  if(countEl) countEl.textContent=`Showing ${rows.length} of ${items.length} teaching resource${items.length===1?'':'s'}`;
  renderLimitedLibrary(grid,rows,(x,i)=>{
    const yt=getYouTubeId(x.url||'');
    const customThumb=x.thumbnailUrl||x.thumbnail||'';
    const thumb=customThumb || (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : '');
    const playable=!!yt;
    const href=x.url && x.url!=='#' ? escapeAttr(x.url) : '#';
    const thumbHtml=playable
      ? `<button class="teaching-thumb teaching-thumb-link" type="button" data-youtube-id="${escapeAttr(yt)}" data-video-title="${escapeAttr(x.title||'Teaching resource')}" aria-label="Play ${escapeAttr(x.title||'teaching resource')}">${thumb?`<span class="teaching-thumb-bg" style="background-image:linear-gradient(rgba(7,23,37,.10),rgba(7,23,37,.52)),url('${escapeAttr(thumb)}')"></span>`:''}<span class="teaching-play">▶</span></button>`
      : `<div class="teaching-thumb">${thumb?`<span class="teaching-thumb-bg" style="background-image:linear-gradient(rgba(7,23,37,.18),rgba(7,23,37,.5)),url('${escapeAttr(thumb)}')"></span>`:''}<span class="teaching-play">▶</span></div>`;
    const action=playable
      ? `<button class="teaching-link teaching-video-trigger" type="button" data-youtube-id="${escapeAttr(yt)}" data-video-title="${escapeAttr(x.title||'Teaching resource')}">Watch / View ↗</button>`
      : `<a class="teaching-link ${href==='#'?'disabled-teaching-link':''}" href="${href}" ${href!=='#'?'target="_blank" rel="noopener"':''}>${href!=='#'?'Open Resource ↗':'Coming soon →'}</a>`;
    return `<article class="teaching-card teaching-hover-card">
      ${thumbHtml}
      <div class="teaching-card-body">
        ${x.featured?'<span class="content-featured-badge">★ FEATURED</span>':''}
        <div class="teaching-card-meta"><span class="teaching-type">${escapeHtml(x.type||'Lecture')}</span>${x.category?`<span class="teaching-category">${escapeHtml(x.category)}</span>`:''}</div>
        <h3>${escapeHtml(x.title||'Teaching resource')}</h3>
        <p>${escapeHtml(x.description||'')}</p>
        <div class="teaching-tags">${splitList(x.subjects||x.tags).slice(0,4).map(t=>`<span class="teaching-tag">${escapeHtml(t)}</span>`).join('')}</div>
        ${action}
      </div>
    </article>`;
  }, '<div class="teaching-empty">No teaching resources match your search or filters.</div>');
}

['teachingFilters','teachingSearch','teachingSubjectFilter'].forEach(()=>{});
document.addEventListener('click',e=>{
  const filter=e.target.closest('.teaching-filter');
  if(filter){
    document.querySelectorAll('.teaching-filter').forEach(x=>x.classList.remove('active'));
    filter.classList.add('active');
    const grid=document.getElementById('publicTeachingGrid'); if(grid) grid.dataset.expanded='false';
    renderPublicTeaching(getContent()); return;
  }
  const trigger=e.target.closest('.teaching-video-trigger,.teaching-thumb-link');
  if(trigger && trigger.dataset.youtubeId){ e.preventDefault(); openTeachingVideo(trigger.dataset.youtubeId,trigger.dataset.videoTitle||'Teaching video'); }
  if(e.target.closest('[data-close-video]')) closeTeachingVideo();
});
document.getElementById('teachingSearch')?.addEventListener('input',()=>{const grid=document.getElementById('publicTeachingGrid'); if(grid) grid.dataset.expanded='false'; renderPublicTeaching(getContent());});
document.getElementById('teachingSubjectFilter')?.addEventListener('change',()=>{const grid=document.getElementById('publicTeachingGrid'); if(grid) grid.dataset.expanded='false'; renderPublicTeaching(getContent());});
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeTeachingVideo();});


document.addEventListener('click',e=>{
  const tv=e.target.closest('.disabled-teaching-link');
  if(tv){ e.preventDefault(); alert('This teaching resource is not published yet. Add its YouTube or resource URL from Admin → Teaching.'); return; }
  const cv=e.target.closest('[data-cv-download]');
  if(cv && cv.classList.contains('disabled-link')){
    e.preventDefault();
    alert('Please upload your CV PDF from Admin → Photo & Media first.');
  }
});

window.addEventListener('load',()=>setTimeout(()=>renderMediaPublic().catch(()=>{}),700));


function initContactForm(){
  const form=document.getElementById('contactForm');
  const modal=document.getElementById('contactModal');
  const success=document.getElementById('contactSuccess');
  if(!form || !modal) return;
  const status=document.getElementById('contactFormStatus');
  const submit=form.querySelector('button[type="submit"]');
  const openers=document.querySelectorAll('[data-open-contact-modal]');
  const closers=modal.querySelectorAll('[data-close-contact-modal]');
  const firstField=form.querySelector('input[name="name"]');
  let started=Date.now();

  const openModal=()=>{
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('contact-modal-open');
    started=Date.now();
    window.setTimeout(()=>firstField?.focus(),60);
  };
  const resetFormView=()=>{
    form.hidden=false;
    if(success) success.hidden=true;
    if(status){status.className='contact-form-status';status.textContent='';}
    submit.disabled=false;
  };
  const closeModal=()=>{
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('contact-modal-open');
    window.setTimeout(()=>{ if(!modal.classList.contains('is-open')) resetFormView(); },180);
  };

  openers.forEach(btn=>btn.addEventListener('click',openModal));
  closers.forEach(btn=>btn.addEventListener('click',closeModal));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && modal.classList.contains('is-open')) closeModal();
  });

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const data=new FormData(form);
    const honeypot=String(data.get('website')||'').trim();
    const elapsed=Date.now()-started;
    const email=String(data.get('email')||'').trim();
    const name=String(data.get('name')||'').trim();
    const category=String(data.get('category')||'').trim();
    const subject=String(data.get('subject')||'').trim();
    const message=String(data.get('message')||'').trim();
    if(honeypot || elapsed<1800){
      form.reset();
      closeModal();
      return;
    }
    if(!name || !email || !category || !subject || !message || !/^\S+@\S+\.\S+$/.test(email) || message.length<10){
      if(status){status.className='contact-form-status error';status.textContent='Please complete every required field. Enter a valid email address and a message of at least 10 characters.';}
      const invalid=form.querySelector(':invalid');
      invalid?.focus();
      return;
    }
    submit.disabled=true;
    if(status){status.className='contact-form-status loading';status.textContent='Sending your enquiry…';}
    const payload={name,email,category,subject,message,source:'portfolio-website'};
    try{
      const cfg=portfolioDB.read();
      if(!cfg?.url || !cfg?.anonKey) throw new Error('Supabase is not configured.');
      let handledByFunction=false;
      try{
        const response=await fetch(`${cfg.url.replace(/\/$/,'')}/functions/v1/contact-notification`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`},body:JSON.stringify(payload)});
        if(response.ok) handledByFunction=true;
      }catch(_){/* fallback below */}
      if(!handledByFunction) await portfolioDB.submitContactInquiry(payload);
      form.reset();
      form.hidden=true;
      if(status){status.className='contact-form-status';status.textContent='';}
      if(success) success.hidden=false;
    }catch(err){
      if(status){status.className='contact-form-status error';status.textContent='We could not send your enquiry right now. Please try again or use the email link above.';}
    }finally{submit.disabled=false;}
  });
}

document.addEventListener('DOMContentLoaded',initContactForm);
