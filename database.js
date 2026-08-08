/* V19 — Supabase database + authentication helper
   Matches the V15 database schema:
   - public.site_content(section, content)
   - public.admin_users(id, email, role)
   - public.is_admin() RPC
*/
(function(){
  const KEY='pratikshaSupabaseConfigV1';

  function read(){
    try{
      return JSON.parse(localStorage.getItem(KEY)||'null')
        || window.SUPABASE_CONFIG
        || {url:'',anonKey:''};
    }catch{
      return window.SUPABASE_CONFIG||{url:'',anonKey:''};
    }
  }

  function save(cfg){
    localStorage.setItem(KEY,JSON.stringify(cfg));
  }

  function client(){
    const c=read();
    if(!c?.url || !c?.anonKey || !window.supabase?.createClient) return null;
    return window.supabase.createClient(c.url,c.anonKey);
  }

  async function session(){
    const c=client();
    if(!c) return null;
    const {data,error}=await c.auth.getSession();
    if(error) throw error;
    return data.session;
  }

  async function user(){
    const c=client();
    if(!c) return null;
    const {data,error}=await c.auth.getUser();
    if(error) throw error;
    return data.user;
  }

  async function isAdmin(){
    const c=client();
    if(!c) return false;
    // Admin authorization is intentionally checked through the server-side
    // SECURITY DEFINER RPC. This avoids exposing the admin table to the public
    // website while still allowing authenticated admins to save content/media.
    const {data,error}=await c.rpc('is_admin');
    if(error){
      const msg=error.message||String(error);
      throw new Error('Supabase admin check failed: '+msg);
    }
    return data === true;
  }

  async function signIn(email,password){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    return c.auth.signInWithPassword({email,password});
  }

  async function signOut(){
    const c=client();
    if(c) await c.auth.signOut();
  }

  async function loadContent(){
    const c=client();
    if(!c) return null;

    const {data,error}=await c
      .from('site_content')
      .select('section,content');

    if(error) throw error;

    const out={};
    (data||[]).forEach(row=>{
      out[row.section]=row.content;
    });
    return out;
  }

  async function saveContent(content){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');

    const rows=Object.entries(content).map(([section,content])=>({
      section,
      content,
      updated_at:new Date().toISOString()
    }));

    const {error}=await c
      .from('site_content')
      .upsert(rows,{onConflict:'section'});

    if(error) throw error;
    return true;
  }

  async function loadMediaLibrary(includeDrafts=false){
    const c=client();
    if(!c) return null;
    let q=c.from('media_library')
      .select('id,title,description,category,file_name,storage_path,public_url,mime_type,file_size,thumbnail_path,thumbnail_url,published,featured,sort_order,created_at,updated_at')
      .order('sort_order',{ascending:true}).order('id',{ascending:true});
    if(!includeDrafts) q=q.eq('published',true);
    const {data,error}=await q;
    if(error) throw error;
    return data||[];
  }
  async function upsertMediaLibrary(rows){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const payload=(rows||[]).map((r,i)=>({
      ...(r.id?{id:r.id}:{}),
      title:r.title||r.file_name||'Untitled media',
      description:r.description||'',
      category:r.category||'',
      file_name:r.file_name||'',
      storage_path:r.storage_path||'',
      public_url:r.public_url||'',
      mime_type:r.mime_type||'',
      file_size:Number(r.file_size)||0,
      thumbnail_path:r.thumbnail_path||'',
      thumbnail_url:r.thumbnail_url||'',
      published:r.published!==false,
      featured:r.featured===true,
      sort_order:Number.isFinite(Number(r.sort_order))?Number(r.sort_order):i,
      updated_at:new Date().toISOString()
    }));
    if(!payload.length) return true;
    const {error}=await c.from('media_library').upsert(payload,{onConflict:'id'});
    if(error) throw error;
    return true;
  }
  async function deleteMediaLibraryById(id){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const {error}=await c.from('media_library').delete().eq('id',id);
    if(error) throw error;
    return true;
  }


  async function submitContactInquiry(payload){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    const clean={
      name:String(payload?.name||'').trim().slice(0,120),
      email:String(payload?.email||'').trim().slice(0,254),
      category:String(payload?.category||'General enquiry').trim().slice(0,80),
      subject:String(payload?.subject||'').trim().slice(0,180),
      message:String(payload?.message||'').trim().slice(0,5000),
      source:String(payload?.source||'portfolio-website').trim().slice(0,60)
    };
    const {data,error}=await c.from('contact_inquiries').insert(clean).select('id,created_at').single();
    if(error) throw error;
    return data;
  }
  async function loadContactInquiries(){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const {data,error}=await c.from('contact_inquiries').select('*').order('created_at',{ascending:false}).limit(100);
    if(error) throw error;
    return data||[];
  }
  async function updateContactInquiry(id,patch){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const {error}=await c.from('contact_inquiries').update(patch).eq('id',id);
    if(error) throw error;
    return true;
  }
  async function deleteContactInquiry(id){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const {error}=await c.from('contact_inquiries').delete().eq('id',id);
    if(error) throw error;
    return true;
  }

  async function test(){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');

    const {error}=await c
      .from('site_content')
      .select('section')
      .limit(1);

    if(error) throw error;
    return true;
  }

  async function upload(bucket,path,file,options={}){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    const {data,error}=await c.storage.from(bucket).upload(path,file,options);
    if(error) throw error;
    return data;
  }

  async function remove(bucket,paths){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    const {data,error}=await c.storage.from(bucket).remove(paths);
    if(error) throw error;
    return data;
  }

  function publicUrl(bucket,path){
    const c=client();
    if(!c) return '';
    return c.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }


  async function loadResources(){
    const c=client();
    if(!c) return null;
    const {data,error}=await c
      .from('resources')
      .select('id,title,description,category,resource_url,file_url,icon_url,sort_order,published,featured,created_at,updated_at')
      .eq('published',true)
      .order('sort_order',{ascending:true})
      .order('id',{ascending:true});
    if(error) throw error;
    return data||[];
  }

  async function loadAllResources(){
    const c=client();
    if(!c) return null;
    const {data,error}=await c
      .from('resources')
      .select('id,title,description,category,resource_url,file_url,icon_url,sort_order,published,featured,created_at,updated_at')
      .order('sort_order',{ascending:true})
      .order('id',{ascending:true});
    if(error) throw error;
    return data||[];
  }

  async function upsertResources(rows){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const payload=rows.map((r,i)=>({
      ...(r.id ? {id:r.id} : {}),
      title:r.title||'Untitled resource',
      description:r.description||'',
      category:r.category||'',
      resource_url:r.resource_url||'',
      file_url:r.file_url||'',
      icon_url:r.icon_url||'',
      sort_order:i,
      published:r.published!==false,
      featured:r.featured===true,
      updated_at:new Date().toISOString()
    }));
    if(payload.length){
      const {error}=await c.from('resources').upsert(payload,{onConflict:'id'});
      if(error) throw error;
    }
    return true;
  }

  async function deleteResourceById(id){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    if(!id) return true;
    const {error}=await c.from('resources').delete().eq('id',id);
    if(error) throw error;
    return true;
  }

  async function deleteResourcesExcept(ids){
    const c=client();
    if(!c) throw new Error('Supabase is not configured.');
    if(!(await isAdmin())) throw new Error('Admin access is required.');
    const keep=(ids||[]).filter(Boolean);
    // Supabase requires every DELETE to include a filter.
    // When keep is empty, delete all resource rows using a harmless
    // non-matching UUID filter instead of an unfiltered DELETE.
    let q=c.from('resources').delete();
    if(keep.length) {
      q=q.not('id','in',`(${keep.join(',')})`);
    } else {
      // The resources table uses a BIGINT identity id, not UUID.
      // Use a valid BIGINT filter so Supabase accepts the DELETE.
      // Identity ids are non-negative, so this matches every resource row.
      q=q.gte('id',0);
    }
    const {error}=await q;
    if(error) throw error;
    return true;
  }

  window.portfolioDB={
    read,save,client,session,user,isAdmin,signIn,signOut,
    loadContent,saveContent,loadResources,loadAllResources,upsertResources,deleteResourceById,deleteResourcesExcept,loadMediaLibrary,upsertMediaLibrary,deleteMediaLibraryById,submitContactInquiry,loadContactInquiries,updateContactInquiry,deleteContactInquiry,test,upload,remove,publicUrl,
    clear:()=>localStorage.removeItem(KEY)
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const u=document.getElementById('supabaseUrl');
    const k=document.getElementById('supabaseKey');
    const status=document.getElementById('dbStatus');
    if(!u||!k) return;

    const cfg=read();
    u.value=cfg.url||'';
    k.value=cfg.anonKey||'';

    const msg=(text,type='')=>{
      if(status){
        status.textContent=text;
        status.className='db-status '+type;
      }
    };

    document.getElementById('saveDbConfig')?.addEventListener('click',()=>{
      save({url:u.value.trim(),anonKey:k.value.trim()});
      msg('Connection details saved in this browser.','ok');
    });

    document.getElementById('testDbConnection')?.addEventListener('click',async()=>{
      save({url:u.value.trim(),anonKey:k.value.trim()});
      msg('Testing connection…');
      try{
        await test();
        msg('Connected successfully. Supabase is reachable.','ok');
      }catch(e){
        msg('Connection test failed: '+(e.message||e),'err');
      }
    });

    document.getElementById('clearDbConfig')?.addEventListener('click',()=>{
      portfolioDB.clear();
      u.value='';
      k.value='';
      msg('Database connection details cleared.');
    });

    document.getElementById('checkAuthStatus')?.addEventListener('click',async()=>{
      try{
        const s=await session();
        if(!s){
          msg('No Supabase user is signed in.','err');
          return;
        }
        const a=await isAdmin();
        msg(
          `Signed in as ${s.user.email}. Admin access: ${a?'yes':'no'}.`,
          a?'ok':'err'
        );
      }catch(e){
        msg('Auth check failed: '+(e.message||e),'err');
      }
    });
  });
})();
