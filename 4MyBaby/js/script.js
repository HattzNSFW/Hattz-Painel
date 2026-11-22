(() => {
"use strict";
const read=document.querySelector("#readButton");
const letter=document.querySelector("#letter");
const moments=[...document.querySelectorAll(".moment")];
const panel=document.querySelector("#momentReveal");
const text=document.querySelector("#momentText");
const close=document.querySelector("#closeMoment");
read?.addEventListener("click",()=>letter?.scrollIntoView({behavior:"smooth",block:"start"}));
moments.forEach(item=>item.addEventListener("click",()=>{
 if(!panel||!text)return;
 const already=item.getAttribute("aria-expanded")==="true";
 moments.forEach(button=>button.setAttribute("aria-expanded","false"));
 if(already){panel.hidden=true;return;}
 text.textContent=item.dataset.message||"";
 item.setAttribute("aria-expanded","true");
 panel.hidden=false;
 panel.scrollIntoView({behavior:"smooth",block:"nearest"});
}));
close?.addEventListener("click",()=>{
 if(panel)panel.hidden=true;
 moments.forEach(item=>item.setAttribute("aria-expanded","false"));
});
})();