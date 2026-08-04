import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getAuthProvider, getCompanyRepository, getFaqRepository, getKnowledgeRepository, getMessageRepository, getProfileRepository, getThreadRepository } from "@/lib/providers/registry";
import { resolveChatModel, resolveEmbedOne } from "@/lib/ai-provider.server";
import type { JsonLike } from "@/lib/providers/interfaces";

type Body={messages?:UIMessage[];threadId?:string;language?:string};
type Source={type:"document"|"faq";id:string;document_id?:string;title:string;code?:string|null;excerpt:string;similarity?:number;version?:number;section?:string|null;page?:number|null;last_updated?:string|null;confidence?:"high"|"medium"|"low";primary?:boolean};

const refusal="I could not find reliable information inside your company knowledge base.";
const greeting=/^(hi|hello|hey|hallo|guten\s*(morgen|tag|abend)|salut|bun[ăa]|mul[țt]umesc|danke|thanks)\b/i;
const followup=/\b(explain|more details|elaborate|clarify|continue|erkl[äa]re|mehr details|explic[ăa]|mai multe detalii|continu[ăa])\b/i;
function textOf(message:UIMessage|undefined){return message?.parts.map((p)=>p.type==="text"?p.text:"").join(" ").trim()??"";}
function prompt(context:string,hasSources:boolean,language:string){return `You are OPSQAI, an enterprise company knowledge assistant. Answer in the same language as the user's latest message (interface hint: ${language}). Use ONLY COMPANY KNOWLEDGE below. Never guess. ${hasSources?"Give a concise answer and finish with a translated Sources label and citations.":`Reply only with a natural translation of: "${refusal}"`}\n\nCOMPANY KNOWLEDGE:\n${context||"(none)"}`;}

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
  const thread=(await threads.listForUser(identity.userId,{limit:500})).find((item)=>item.id===body.threadId);
  if(!thread)return new Response("Thread not found",{status:404});
  const profile=await getProfileRepository(dataCtx).findByUserId(identity.userId);
  const companyId=thread.companyId||profile?.companyId;
  if(!companyId)return new Response("Company not found",{status:400});

  const query=textOf([...messages].reverse().find((m)=>m.role==="user"));
  const isGreeting=greeting.test(query);
  const isFollowup=!isGreeting&&messages.some((m)=>m.role==="assistant")&&followup.test(query);
  const sources:Source[]=[];
  let context="";
  let confidence=0;

  if(!isGreeting&&query){
    try{
      const [embedding,faqs]=await Promise.all([resolveEmbedOne(query),getFaqRepository(dataCtx).list(companyId)]);
      const matches=await getKnowledgeRepository(dataCtx).searchSimilar(companyId,embedding,8);
      const docs=await getKnowledgeRepository(dataCtx).getDocumentsByIds(Array.from(new Set(matches.map((m)=>m.document_id))));
      const meta=new Map(docs.map((d)=>[d.id,d]));
      matches.forEach((m,index)=>{const doc=meta.get(m.document_id);const sim=Number(m.similarity??0);sources.push({type:"document",id:`${m.document_id}:${m.chunk_index}`,document_id:m.document_id,title:doc?.title??"Knowledge document",code:doc?.docCode,excerpt:m.content,similarity:sim,version:doc?.version,section:doc?.section,page:doc?.page,last_updated:doc?.updatedAt,confidence:sim>=.6?"high":sim>=.4?"medium":"low",primary:index===0});});
      const words=query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w)=>w.length>3);
      faqs.map((faq)=>({faq,score:words.reduce((n,w)=>n+(faq.question_en.toLowerCase().includes(w)||faq.question_de.toLowerCase().includes(w)?2:0)+(faq.answer_en.toLowerCase().includes(w)||faq.answer_de.toLowerCase().includes(w)?1:0),0)})).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).forEach(({faq,score})=>sources.push({type:"faq",id:faq.id,title:`${faq.question_en} / ${faq.question_de}`,excerpt:`EN: ${faq.answer_en}\nDE: ${faq.answer_de}`,confidence:score>=4?"high":score>=2?"medium":"low"}));
      confidence=matches.length?matches.slice(0,3).reduce((sum,m)=>sum+Number(m.similarity??0),0)/Math.min(3,matches.length):sources.some((s)=>s.type==="faq")?0.65:0;
      context=sources.map((s,i)=>`[${s.type==="document"?"Document":"FAQ"} ${i+1}] ${s.code?`${s.code} — `:""}${s.title}\n${s.excerpt}`).join("\n\n---\n\n");
    }catch(error){console.error("[chat:retrieval]",error);}
  }

  const system=isGreeting?`You are OPSQAI. Reply warmly in the user's language in 1-2 sentences and mention you answer from company knowledge.`:isFollowup&&context?prompt(context,true,body.language??"en"):prompt(context,sources.length>0,body.language??"en");
  const result=streamText({model:resolveChatModel("chat"),system,messages:await convertToModelMessages(messages)});
  const messageRepo=getMessageRepository(dataCtx);
  const existing=await messageRepo.listByThread(body.threadId);
  return result.toUIMessageStreamResponse({originalMessages:messages,messageMetadata:({part})=>part.type==="start"?{sources,mode:isGreeting?"greeting":sources.length?"kb":"gap",question:query,confidence,minConfidence:.55,isKnowledgeGap:!isGreeting&&sources.length===0}:undefined,onFinish:async({messages:finished})=>{
    const fresh=finished.slice(existing.length);
    await messageRepo.insertMany(fresh.map((m)=>({threadId:body.threadId as string,userId:identity.userId,companyId,role:m.role,content:textOf(m).slice(0,100000),parts:JSON.parse(JSON.stringify(m.parts)) as JsonLike,sources:m.role==="assistant"?JSON.parse(JSON.stringify(sources)) as JsonLike:null,confidence:m.role==="assistant"?confidence:null})));
  }});
}}}});