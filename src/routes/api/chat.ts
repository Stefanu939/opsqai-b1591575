import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, type UIMessage } from "ai";
import { getAuthProvider, getCompanyRepository, getFaqRepository, getKnowledgeRepository, getMessageRepository, getProfileRepository, getThreadRepository } from "@/lib/providers/registry";
import { resolveChatModel, resolveEmbedOne, hasAiCapability } from "@/lib/ai-provider.server";
import { getStorageProvider } from "@/lib/providers/registry";
import { detectGapSignal, detectLanguage, firstNameFrom, groundedSystemPrompt, passesGrounding, refusalText, relevantSources, resolveAnswerLanguage } from "@/lib/chat-grounding";
import { recordAutoKnowledgeGap } from "@/lib/knowledge-gap-auto.server";
import type { JsonLike } from "@/lib/providers/interfaces";

type Body={messages?:UIMessage[];threadId?:string;language?:string};
type ImageRef={id:string;document_id:string;caption:string|null;data_url:string};
const CHAT_IMG_PREFIX="chatimg:";
const CHAT_IMAGES_BUCKET="chat-images";
const KNOWLEDGE_IMAGES_BUCKET="knowledge-images";

function bytesToB64(bytes:Uint8Array):string{let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);}

/** Build the model-facing message list: resolve chatimg refs to data URLs when vision is available, else strip them with a clear note. Never mutates the persisted UIMessage objects. */
async function prepareMessagesForModel(messages:UIMessage[],userId:string):Promise<UIMessage[]>{
  const vision=hasAiCapability("vision");
  const storage=getStorageProvider();
  const out:UIMessage[]=[];
  for(const m of messages){
    const parts:UIMessage["parts"]=[];
    let hadImage=false;
    for(const part of m.parts){
      const p=part as any;
      if(p.type==="file"&&typeof p.url==="string"&&p.url.startsWith(CHAT_IMG_PREFIX)){
        hadImage=true;
        const path=p.url.slice(CHAT_IMG_PREFIX.length);
        if(vision&&path.split("/")[0]===userId){
          try{
            const bytes=await storage.get(CHAT_IMAGES_BUCKET,path);
            parts.push({...p,url:`data:${p.mediaType||"image/png"};base64,${bytesToB64(bytes)}`});
            continue;
          }catch(error){console.error("[chat:image-resolve]",error);}
        }
        continue;
      }
      parts.push(part);
    }
    if(hadImage&&!vision){
      parts.push({type:"text",text:"\n\n[Note: an image was attached but image analysis is unavailable on the configured AI engine.]"} as any);
    }
    out.push({...m,parts});
  }
  return out;
}
type Source={type:"document"|"faq";id:string;document_id?:string;title:string;code?:string|null;excerpt:string;similarity?:number;version?:number;section?:string|null;page?:number|null;last_updated?:string|null;confidence?:"high"|"medium"|"low";primary?:boolean};

const greeting=/^(hi|hello|hey|hallo|guten\s*(morgen|tag|abend)|salut|bun[ăa]|mul[țt]umesc|danke|thanks)\b/i;
const capability=/(what can you (do|tell)|what do you know|how can you help|who are you|help me|was kannst du|wie kannst du helfen|wer bist du|ce po[țt]i (s[ăa] )?(imi |îmi )?(spui|faci|oferi)|cu ce (m[ăa] )?po[țt]i ajuta|cine e[șs]ti|ajut[ăa]-?m[ăa])/i;
const followup=/\b(explain|more details|elaborate|clarify|continue|erkl[äa]re|mehr details|explic[ăa]|mai multe detalii|continu[ăa])\b/i;
function textOf(message:UIMessage|undefined){return message?.parts.map((p)=>p.type==="text"?p.text:"").join(" ").trim()??"";}



export const Route=createFileRoute("/api/chat")({server:{handlers:{POST:async({request})=>{
  const header=request.headers.get("authorization");
  if(!header?.startsWith("Bearer "))return new Response("Unauthorized",{status:401});
  let identity;
  try{identity=await getAuthProvider().verifyAccessToken(header.slice(7));}catch{return new Response("Unauthorized",{status:401});}
  const body=await request.json() as Body;
  const messages=Array.isArray(body.messages)?body.messages:[];
  if(!body.threadId)return new Response("threadId required",{status:400});

  const dataCtx=await getAuthProvider().getDataContext(header.slice(7));
  const threads=getThreadRepository(dataCtx);
  // Thread ownership + profile + existing history are independent reads: run them
  // together so the first token is not delayed by three sequential round trips.
  const messageRepo=getMessageRepository(dataCtx);
  const [threadList,profile,existing]=await Promise.all([
    threads.listForUser(identity.userId,{limit:200}),
    getProfileRepository(dataCtx).findByUserId(identity.userId),
    messageRepo.listByThread(body.threadId),
  ]);
  const thread=threadList.find((item)=>item.id===body.threadId);
  if(!thread)return new Response("Thread not found",{status:404});
  const companyId=thread.companyId||profile?.companyId;
  if(!companyId)return new Response("Company not found",{status:400});
  const firstName=firstNameFrom(profile?.fullName,identity.email);


  const query=textOf([...messages].reverse().find((m)=>m.role==="user"));
  const isGreeting=greeting.test(query);
  const isCapability=!isGreeting&&capability.test(query);
  const isFollowup=!isGreeting&&!isCapability&&messages.some((m)=>m.role==="assistant")&&followup.test(query);
  const sources:Source[]=[];
  let context="";
  let confidence=0;
  let overview="";

  if(isCapability){
    try{
      const [docs,faqs]=await Promise.all([getKnowledgeRepository(dataCtx).listDocuments(companyId,false),getFaqRepository(dataCtx).list(companyId)]);
      overview=`SOPs and knowledge documents (${docs.length}): ${docs.slice(0,25).map((d:{title:string})=>d.title).join("; ")}\nFAQ entries (${faqs.length}): ${faqs.slice(0,15).map((f:{question_en:string})=>f.question_en).join("; ")}`;
    }catch(error){console.error("[chat:overview]",error);}
  } else if(!isGreeting&&query){
    try{
      const [embedding,faqs]=await Promise.all([resolveEmbedOne(query),getFaqRepository(dataCtx).list(companyId)]);
      const matches=await getKnowledgeRepository(dataCtx).searchSimilar(companyId,embedding,12);
      const docs=await getKnowledgeRepository(dataCtx).getDocumentsByIds(Array.from(new Set(matches.map((m)=>m.document_id))));
      const meta=new Map(docs.map((d)=>[d.id,d]));
      matches.forEach((m,index)=>{const doc=meta.get(m.document_id);const sim=Number(m.similarity??0);sources.push({type:"document",id:`${m.document_id}:${m.chunk_index}`,document_id:m.document_id,title:doc?.title??"Knowledge document",code:doc?.docCode,excerpt:m.content,similarity:sim,version:doc?.version,section:doc?.section,page:doc?.page,last_updated:doc?.updatedAt,confidence:sim>=.45?"high":sim>=.28?"medium":"low",primary:index===0});});
      const words=query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w)=>w.length>3);
      faqs.map((faq)=>({faq,score:words.reduce((n,w)=>n+(faq.question_en.toLowerCase().includes(w)||faq.question_de.toLowerCase().includes(w)?2:0)+(faq.answer_en.toLowerCase().includes(w)||faq.answer_de.toLowerCase().includes(w)?1:0),0)})).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).forEach(({faq,score})=>sources.push({type:"faq",id:faq.id,title:`${faq.question_en} / ${faq.question_de}`,excerpt:`EN: ${faq.answer_en}\nDE: ${faq.answer_de}`,confidence:score>=4?"high":score>=2?"medium":"low"}));
      confidence=matches.length?matches.slice(0,3).reduce((sum,m)=>sum+Number(m.similarity??0),0)/Math.min(3,matches.length):sources.some((s)=>s.type==="faq")?0.5:0;
      const strong=relevantSources(sources);
      context=strong.map((s,i)=>`[${s.type==="document"?"Document":"FAQ"} ${i+1}] ${s.code?`${s.code} — `:""}${s.title}\n${s.excerpt}`).join("\n\n---\n\n");
    }catch(error){console.error("[chat:retrieval]",error);}
  }
  let images:ImageRef[]=[];
  try{
    const docSources=sources.filter((s)=>s.type==="document"&&s.document_id);
    const byDoc=new Map<string,number[]>();
    for(const s of docSources.slice(0,4)){
      const idx=Number(s.id.split(":")[1]);
      if(!Number.isFinite(idx))continue;
      const arr=byDoc.get(s.document_id as string)??[];
      arr.push(idx);
      byDoc.set(s.document_id as string,arr);
    }
    const storage=getStorageProvider();
    for(const [docId,idxs] of byDoc){
      if(images.length>=3)break;
      const rows=await getKnowledgeRepository(dataCtx).getImagesForChunks(docId,idxs);
      for(const row of rows.filter((r)=>r.approved)){
        if(images.length>=3)break;
        try{
          const bytes=await storage.get(KNOWLEDGE_IMAGES_BUCKET,row.storage_path);
          images.push({id:row.id,document_id:row.document_id,caption:row.caption,data_url:`data:${row.mime_type};base64,${bytesToB64(bytes)}`});
        }catch(error){console.error("[chat:image-cite]",error);}
      }
    }
  }catch(error){console.error("[chat:image-gather]",error);}
  const userTexts=messages.filter((m)=>m.role==="user").map((m)=>textOf(m));
  const answerLanguage=resolveAnswerLanguage(userTexts,body.language);
  const grounded=passesGrounding(sources,confidence)||(isFollowup&&Boolean(context));
  const messageRepo=getMessageRepository(dataCtx);
  const existing=await messageRepo.listByThread(body.threadId);
  const persist=async(finished:UIMessage[])=>{
    const fresh=finished.slice(existing.length);
    await messageRepo.insertMany(fresh.map((m)=>({threadId:body.threadId as string,userId:identity.userId,companyId,role:m.role,content:textOf(m).slice(0,100000),parts:JSON.parse(JSON.stringify(m.parts)) as JsonLike,sources:m.role==="assistant"?JSON.parse(JSON.stringify(sources)) as JsonLike:null,confidence:m.role==="assistant"?confidence:null})));
  };
  const metadata=(mode:"greeting"|"capability"|"kb"|"gap")=>({sources,mode,question:query,confidence,minConfidence:.3,isKnowledgeGap:mode==="gap",images:mode==="kb"?images:[]});

  // Hard grounding gate: no sufficient company evidence => never call the model.
  if(!isGreeting&&!isCapability&&!grounded){
    void recordAutoKnowledgeGap(dataCtx,{companyId,question:query,departmentId:profile?.departmentId??null,createdBy:identity.userId,confidence,sourceThreadId:body.threadId,sourceMessageId:null,reason:sources.length?"low_confidence":"no_source"});
    const stream=createUIMessageStream<UIMessage>({originalMessages:messages,onFinish:({messages:finished})=>{void persist(finished);},execute:({writer})=>{
      writer.write({type:"start",messageMetadata:metadata("gap")});
      writer.write({type:"text-start",id:"refusal"});
      writer.write({type:"text-delta",id:"refusal",delta:refusalText(query,body.language)});
      writer.write({type:"text-end",id:"refusal"});
    }});
    return createUIMessageStreamResponse({stream});
  }

  const nameHint=firstName!=="there"?` Address them as ${firstName} where it feels natural (e.g. in your greeting), but do not overdo it.`:``;
  const system=isGreeting
    ?`You are OPSQAI, a warm, professional and human-sounding assistant — never robotic. Greet the user genuinely in ${answerLanguage} in 1-2 sentences and mention you answer from company knowledge.${nameHint}`
    :isCapability
      ?`You are OPSQAI, the company knowledge assistant. Sound warm, professional and human — never robotic. The user asks what you can tell them. Reply in ${answerLanguage}.${nameHint} Do NOT describe yourself, your AI features or how you work. Instead summarise the actual documented content available below: group the SOPs/documents into 3-5 topic areas using their real titles, then suggest 3 concrete questions the user can ask about them. Use only the inventory below; invent nothing.\n\nINVENTORY:\n${overview||"(inventory unavailable)"}`
      :groundedSystemPrompt(context,answerLanguage,firstName);

  const modelMessages=await prepareMessagesForModel(messages,identity.userId);
  const result=streamText({model:resolveChatModel("chat"),system,messages:await convertToModelMessages(modelMessages)});
  return result.toUIMessageStreamResponse({originalMessages:messages,messageMetadata:({part})=>part.type==="start"?metadata(isGreeting?"greeting":isCapability?"capability":"kb"):undefined,onFinish:async({messages:finished})=>{
    await persist(finished);
    if(isGreeting||isCapability)return;
    const answerText=textOf([...finished].reverse().find((m)=>m.role==="assistant"));
    const signal=detectGapSignal({sources,confidence,grounded,answerText});
    if(signal.isGap)await recordAutoKnowledgeGap(dataCtx,{companyId,question:query,departmentId:profile?.departmentId??null,createdBy:identity.userId,confidence,sourceThreadId:body.threadId as string,sourceMessageId:null,reason:signal.reason});
  }});

}}}});