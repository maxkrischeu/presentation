/* Cloze interaction owns placements; the quiz engine owns scoring and sessions. */
Presentation.factories.quizCloze = function ({slide, settings, controls, record, score}) {
  const t = Presentation.t;
  const answers = [...slide.querySelectorAll('.answer')].map(el => el.textContent.trim());
  const slots = [], tokens = [];
  let selected = null, checked = false;
  const bank = document.createElement('div');bank.className='quiz-cloze-bank';
  bank.dataset.presentationKeyboard='local';
  bank.setAttribute('aria-label',t('Available terms'));
  const [check,again,reset,feedback] = controls;
  const row=document.createElement('div');row.className='button-container';
  if(settings.includeScore){const label=document.createElement('div');label.className='score';label.setAttribute('role','status');row.append(label);}
  feedback.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='quiz-action-group';actions.append(check,again,reset);row.append(feedback,actions);
  function choose(index){selected=selected===index?null:index;tokens.forEach((token,i)=>token.setAttribute('aria-pressed',String(i===selected)));}
  function place(index,slot){
    if(checked || index===null || !tokens[index])return;
    const token=tokens[index],old=token.parentElement;
    const previous=slot?.querySelector('.quiz-cloze-token');
    if(previous===token){choose(null);return;}
    if(previous)old.append(previous);
    (slot||bank).append(token);choose(null);update();
  }
  function update(){check.disabled=checked||slots.some(slot=>!slot.querySelector('.quiz-cloze-token'));tokens.forEach(token=>{token.disabled=checked;token.draggable=!checked;});}
  function dropTarget(element,slot){
    element.addEventListener('dragover',e=>{if(!checked){e.preventDefault();e.dataTransfer.dropEffect='move';}});
    element.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();const value=e.dataTransfer.getData('application/x-presentation-cloze');if(!value)return;try{const data=JSON.parse(value);if(data.slide===slide.id)place(data.index,slot);}catch{}});
  }
  [...slide.querySelectorAll('.answer')].forEach((answer,i)=>{
    const slot=document.createElement('span');slot.className='quiz-cloze-slot';slot.tabIndex=0;slot.dataset.presentationKeyboard='local';slot.setAttribute('role','group');slot.setAttribute('aria-label',t('Gap {number}',{number:i+1}));slot.dataset.number=i+1;
    slot.addEventListener('click',e=>{if(e.target===slot)place(selected,slot);});
    slot.addEventListener('keydown',e=>{if(e.target!==slot)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();place(selected,slot);}if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();e.stopPropagation();const token=slot.querySelector('button');if(token)place(tokens.indexOf(token),null);}});
    dropTarget(slot,slot);answer.replaceWith(slot);slots.push(slot);
    const token=document.createElement('button');token.type='button';token.className='quiz-cloze-token';token.textContent=answers[i];token.draggable=true;
    token.addEventListener('click',e=>{e.stopPropagation();if(!checked)choose(i);});
    token.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
    token.addEventListener('dragstart',e=>{e.dataTransfer.setData('application/x-presentation-cloze',JSON.stringify({slide:slide.id,index:i}));e.dataTransfer.effectAllowed='move';});
    tokens.push(token);
  });
  bank.tabIndex=0;dropTarget(bank,null);bank.addEventListener('click',e=>{if(e.target===bank)place(selected,null);});
  bank.addEventListener('keydown',e=>{if(e.target===bank&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();place(selected,null);}});
  const firstContent = [...slide.children].find(el => !el.matches('h1,h2,h3,h4,h5,h6,aside,script,style,template'));
  slide.insertBefore(bank, firstContent || null);
  slide.append(row);
  // The text and term bank appear together, without revealing individual solutions.
  [...slide.children].filter(el=>!el.matches('h1,h2,h3,aside,script,style,template,[hidden]')).forEach(el=>{el.classList.add('fragment');el.dataset.fragmentIndex='0';});
  function resetAttempt(){
    checked=false;selected=null;feedback.textContent='';
    slots.forEach(slot=>slot.classList.remove('correct','incorrect'));
    const shuffled=[...tokens];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    bank.append(...shuffled);choose(null);update();
  }
  function assess(){
    if(check.disabled)return;
    checked=true;let points=0;
    slots.forEach((slot,i)=>{const correct=slot.textContent.trim()===answers[i];slot.classList.add(correct?'correct':'incorrect');if(correct)points++;});
    const full=points===slots.length;
    feedback.textContent=full?settings.defaultCorrect:points?t('Partly correct!'):settings.defaultIncorrect;
    feedback.style.color=full?'#27ae60':points?'#a87600':'#c0392b';
    record(points);update();
  }
  check.addEventListener('click',assess);again.addEventListener('click',resetAttempt);reset.disabled=settings.disableReset;
  resetAttempt();
  return {reset:resetAttempt,capture:()=>({slide:slide.id,placements:slots.map(slot=>tokens.indexOf(slot.querySelector('button'))),checked,score:score()}),restore(entry){
    resetAttempt();const used=new Set();(entry.placements||[]).forEach((index,i)=>{if(slots[i]&&Number.isInteger(index)&&tokens[index]&&!used.has(index)){place(index,slots[i]);used.add(index);}});
    if(entry.checked)assess();
  }};
};
