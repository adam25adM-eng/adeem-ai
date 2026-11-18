const $ = (id) => document.getElementById(id);
const STORE = "adeem-ai-v1";
let state = JSON.parse(localStorage.getItem(STORE) || "null") || {
  settings: { name: "Adeem AI", tone: "دارجة مغربية بسيطة", instructions: "" },
  chats: [], current: null
};
function persist(){ localStorage.setItem(STORE, JSON.stringify(state)); }
function currentChat(){ return state.chats.find(c => c.id === state.current); }
function newChat(){
  const chat = {id: crypto.randomUUID(), title:"محادثة جديدة", messages:[]};
  state.chats.unshift(chat); state.current=chat.id; persist(); render();
}
function render(){
  $("assistantName").value=state.settings.name;
  $("tone").value=state.settings.tone;
  $("instructions").value=state.settings.instructions;
  $("chatList").innerHTML="";
  state.chats.forEach(chat=>{
    const b=document.createElement("button"); b.className="chat-item"+(chat.id===state.current?" active":"");
    b.textContent=chat.title; b.onclick=()=>{state.current=chat.id;persist();render();}; $("chatList").append(b);
  });
  const chat=currentChat(); $("messages").innerHTML="";
  $("welcome").classList.toggle("hidden",!!(chat&&chat.messages.length));
  if(chat) chat.messages.forEach(m=>addMessage(m.role,m.content,m.error));
}
function addMessage(role,content,error=false){
  const wrap=document.createElement("div"); wrap.className="message "+role+(error?" error":"");
  const avatar=document.createElement("div"); avatar.className="avatar"; avatar.textContent=role==="user"?"أنت":"A";
  const body=document.createElement("div"); body.className="message-content"; body.textContent=content;
  wrap.append(avatar,body); $("messages").append(wrap); $("conversation").scrollTop=$("conversation").scrollHeight;
}
async function sendMessage(text){
  const content=text.trim(); if(!content) return;
  if(!currentChat()) newChat();
  const chat=currentChat(); chat.messages.push({role:"user",content});
  if(chat.messages.length===1) chat.title=content.slice(0,32);
  persist(); render(); $("prompt").value=""; $("sendBtn").disabled=true;
  const thinking={role:"assistant",content:"كنفكر..."}; addMessage("assistant",thinking.content);
  try{
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      messages:chat.messages.filter(m=>!m.error).map(({role,content})=>({role,content})),
      instructions:`اسم المساعد: ${state.settings.name}\nطريقة الكلام: ${state.settings.tone}\n${state.settings.instructions}`
    })});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"ما قدرش يتصل بالمحرك.");
    chat.messages.push({role:"assistant",content:data.reply}); persist();
  }catch(e){
    chat.messages.push({role:"assistant",content:e.message||"وقع خطأ.",error:true}); persist();
  }finally{$("sendBtn").disabled=false;render();}
}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();sendMessage($("prompt").value);});
$("prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("chatForm").requestSubmit();}});
$("newChat").onclick=newChat;
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>sendMessage(b.textContent));
function openSettings(){$("settingsModal").classList.remove("hidden");}
$("settingsOpen").onclick=$("settingsTop").onclick=openSettings;
$("settingsClose").onclick=()=>$("settingsModal").classList.add("hidden");
$("settingsModal").onclick=e=>{if(e.target===$("settingsModal"))$("settingsModal").classList.add("hidden");};
$("saveSettings").onclick=()=>{
  state.settings={name:$("assistantName").value.trim()||"Adeem AI",tone:$("tone").value,instructions:$("instructions").value};
  persist();$("settingsModal").classList.add("hidden");render();
};
$("clearData").onclick=()=>{
  if(confirm("واش متأكد بغيتي تمسح جميع المحادثات؟")){
    state.chats=[];state.current=null;persist();render();
  }
};
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
render();
