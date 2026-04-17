const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const GROUND = H - 50, GRAVITY = 0.6, JUMP_FORCE = -13;
const GAME_SPEED_INIT = 4, WIN_HURDLES = 15, WIN_ROCKETS = 5, PX = 3;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audio = new AudioCtx();
function playTone(freq,type,duration,vol=0.3){const osc=audio.createOscillator();const gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(vol,audio.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+duration);osc.start(audio.currentTime);osc.stop(audio.currentTime+duration);}
function sfxJump(){playTone(300,"square",0.15);playTone(500,"square",0.1);}
function sfxShoot(){playTone(800,"sawtooth",0.08);playTone(600,"sawtooth",0.06);}
function sfxHit(){playTone(150,"sawtooth",0.3,0.4);}
function sfxCollect(){playTone(660,"sine",0.1);playTone(880,"sine",0.12);playTone(1100,"sine",0.1);}
function sfxWin(){[523,659,784,1047].forEach((f,i)=>{setTimeout(()=>playTone(f,"square",0.3),i*120);});}
function drawSprite(sprite,x,y){sprite.forEach((row,ry)=>{[...row].forEach((ch,rx)=>{if(ch===".")return;ctx.fillStyle=PALETTE[ch]||ch;ctx.fillRect(x+rx*PX,y+ry*PX,PX,PX);});});}
const PALETTE={W:"#ffffff",K:"#111111",S:"#a0c8ff",B:"#1a1aff",b:"#0000aa",Y:"#ffff00",y:"#ccaa00",R:"#ff3333",r:"#aa0000",G:"#33ff33",g:"#00aa00",O:"#ff8800",o:"#cc5500",P:"#cc44ff",p:"#880088",C:"#aaffff",T:"#888888",t:"#444444",F:"#ff6666",f:"#ffaa00"};
const SPACEMAN=["..WWWWW...","WCCCCCW..","WCCCCCW..","WWWWWWWW..","BBBBBBB..","BBBBBBBBBB",".BBBBBBB..","BB...BB..","Bb...bB..","Bb...bB..","bb...bb.."];
const SPACEMAN_JUMP=["..WWWWW...","WCCCCCW..","WCCCCCW..","WWWWWWWW..","BBBBBBBBB.","BBBBBBB..","BBBBBBB..","BB...BB..","bb...bb..","b...b..."];
const BULLET=["YYff","YYff"];
const ROCKET_SPRITE=["..WW..","WWWW.","WWWWWW","BBBBBB","BBBBBB","BBBBBB","bBBBbb",".bbb..",".FfF..","..f..."];
const OBS_PROTESTER=["..SSSS..","..SSSS..","..KKKK..",".RRRRRR.",".RRRRRR.",".RR..RR.","..RR.RR.","..RR.RR.","..tt..W.","..tt.WW.","..tt.W..","..tt...."];
const OBS_GOVT=["..SSSS....","..SSSS....","..KKKK....",".ttttttT..","ttttttttT.",".ttttttT..",".tt..ttT..",".tt..tt...",".tt..tt...",".TT..TT..."];
const OBS_NAYSAYER=["..SSSS..","..SSSS..","..KKKK..",".PPPPPP.","PPPPPPPP",".PPPPPP.","SS.PP.PP","...PP.PP","...pp.pp","...pp.pp","...PP..."];
const OBS_TECHFAIL=["..WWWW....","WWWWWW...","WWWWWWWWWW","BBRRRRRWWW","BBRRRRRWWW","BBRRRRRbb.",".RRRbbb...",".RrFfF....","..RfF.....","...r......"];
const WIN_ROCKET=["....WWWW....","...WWWWWW...","..WWWWWWWW..",".WWCCCCCCWW.",".WWCCCCCCWW.",".WWCCCCCCWW.","BBBBBBBBBBBB","BBBBBBBBBBBB","BBBBBBBBBBBB","BBBBBBBBBBBB","BBBBBBBBBBBB","bBBBBBBBBBbb","bBBBBBBBBBbb",".bbbbbbbbb..",".FffFffFff..","..FfFfFfF...","...FffFf....","....Ff......"];
let state="start",score=0,hurdlesCleared=0,rocketsCollected=0,gameSpeed=GAME_SPEED_INIT,frame=0,animFrame=0;
const player={x:80,y:GROUND-SPACEMAN.length*PX,vy:0,onGround:true,jumping:false};
let obstacles=[],rockets=[],bullets=[],particles=[],stars=[];
for(let i=0;i<80;i++){stars.push({x:Math.random()*W,y:Math.random()*(GROUND-20),size:Math.random()<0.3?2:1,speed:Math.random()*0.5+0.1});}
let spawnTimer=0,spawnInterval=90;
function spawnObstacle(){const types=[{sprite:OBS_PROTESTER,label:"PROTESTER",w:8,h:12},{sprite:OBS_GOVT,label:"GOVERNMENT",w:10,h:10},{sprite:OBS_NAYSAYER,label:"NAY-SAYER",w:8,h:11},{sprite:OBS_TECHFAIL,label:"TECH FAIL",w:10,h:10}];const t=types[Math.floor(Math.random()*types.length)];obstacles.push({x:W+10,y:GROUND-t.h*PX,w:t.w*PX,h:t.h*PX,sprite:t.sprite,label:t.label});}
function spawnRocket(){rockets.push({x:W+10,y:GROUND-120-Math.random()*60,w:6*PX,h:10*PX,sprite:ROCKET_SPRITE});}
function burst(x,y,color,count=8){for(let i=0;i<count;i++){const angle=(Math.PI*2*i)/count;particles.push({x,y,vx:Math.cos(angle)*(2+Math.random()*2),vy:Math.sin(angle)*(2+Math.random()*2),life:30,color});}}
const keys={};
document.addEventListener("keydown",(e)=>{
  if(e.code==="Space"){e.preventDefault();if(state==="start"||state==="dead"){startGame();return;}if(state==="playing"&&player.onGround){player.vy=JUMP_FORCE;player.onGround=false;player.jumping=true;sfxJump();}}
  if(e.code==="ShiftLeft"||e.code==="ShiftRight"){e.preventDefault();if(state==="playing")shoot();}
  if(e.code==="Enter"&&state==="win"){startGame();}
  keys[e.code]=true;
});
document.addEventListener("keyup",(e)=>{keys[e.code]=false;});
function shoot(){bullets.push({x:player.x+SPACEMAN[0].length*PX,y:player.y+3*PX,vx:10});sfxShoot();}
function startGame(){state="playing";score=0;hurdlesCleared=0;rocketsCollected=0;gameSpeed=GAME_SPEED_INIT;obstacles=[];rockets=[];bullets=[];particles=[];spawnTimer=0;player.y=GROUND-SPACEMAN.length*PX;player.vy=0;player.onGround=true;player.jumping=false;audio.resume();}
function hitbox(obj){return{x:obj.x+4,y:obj.y+4,w:obj.w-8,h:obj.h-8};}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function update(){
  if(state!=="playing")return;
  frame++;animFrame=Math.floor(frame/8)%2;
  gameSpeed=GAME_SPEED_INIT+hurdlesCleared*0.15;
  player.vy+=GRAVITY;player.y+=player.vy;
  if(player.y>=GROUND-SPACEMAN.length*PX){player.y=GROUND-SPACEMAN.length*PX;player.vy=0;player.onGround=true;player.jumping=false;}
  spawnTimer++;
  if(spawnTimer>=spawnInterval){spawnTimer=0;spawnInterval=Math.max(55,90-hurdlesCleared*2);if(Math.random()<0.25&&rocketsCollected<WIN_ROCKETS){spawnRocket();}else{spawnObstacle();}}
  for(let i=obstacles.length-1;i>=0;i--){obstacles[i].x-=gameSpeed;if(obstacles[i].x+obstacles[i].w<0){obstacles.splice(i,1);hurdlesCleared++;score+=10;}}
  for(let i=rockets.length-1;i>=0;i--){rockets[i].x-=gameSpeed;const ph=hitbox({x:player.x,y:player.y,w:SPACEMAN[0].length*PX,h:SPACEMAN.length*PX});const rh=hitbox(rockets[i]);if(overlaps(ph,rh)){burst(rockets[i].x,rockets[i].y,"#ffff00",12);rockets.splice(i,1);rocketsCollected++;score+=50;sfxCollect();continue;}if(rockets[i].x+rockets[i].w<0)rockets.splice(i,1);}
  for(let i=bullets.length-1;i>=0;i--){bullets[i].x+=bullets[i].vx;if(bullets[i].x>W){bullets.splice(i,1);continue;}let hit=false;for(let j=obstacles.length-1;j>=0;j--){const bh={x:bullets[i].x,y:bullets[i].y,w:BULLET[0].length*PX,h:BULLET.length*PX};const oh=hitbox(obstacles[j]);if(overlaps(bh,oh)){burst(obstacles[j].x+obstacles[j].w/2,obstacles[j].y+obstacles[j].h/2,"#ff4444",10);obstacles.splice(j,1);bullets.splice(i,1);hurdlesCleared++;score+=20;hit=true;break;}}if(hit)continue;}
  const ph=hitbox({x:player.x,y:player.y,w:SPACEMAN[0].length*PX,h:SPACEMAN.length*PX});
  for(const obs of obstacles){if(overlaps(ph,hitbox(obs))){sfxHit();burst(player.x,player.y,"#ff3333",15);state="dead";return;}}
  if(hurdlesCleared>=WIN_HURDLES&&rocketsCollected>=WIN_ROCKETS){sfxWin();state="win";}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;if(p.life<=0)particles.splice(i,1);}
  stars.forEach(s=>{s.x-=s.speed;if(s.x<0)s.x=W;});
}
function update(){
  if(state!=="playing")return;
  frame++;animFrame=Math.floor(frame/8)%2;
  gameSpeed=GAME_SPEED_INIT+hurdlesCleared*0.15;
  player.vy+=GRAVITY;player.y+=player.vy;
  if(player.y>=GROUND-SPACEMAN.length*PX){player.y=GROUND-SPACEMAN.length*PX;player.vy=0;player.onGround=true;player.jumping=false;}
  spawnTimer++;
  if(spawnTimer>=spawnInterval){spawnTimer=0;spawnInterval=Math.max(55,90-hurdlesCleared*2);if(Math.random()<0.25&&rocketsCollected<WIN_ROCKETS){spawnRocket();}else{spawnObstacle();}}
  for(let i=obstacles.length-1;i>=0;i--){obstacles[i].x-=gameSpeed;if(obstacles[i].x+obstacles[i].w<0){obstacles.splice(i,1);hurdlesCleared++;score+=10;}}
  for(let i=rockets.length-1;i>=0;i--){rockets[i].x-=gameSpeed;const ph=hitbox({x:player.x,y:player.y,w:SPACEMAN[0].length*PX,h:SPACEMAN.length*PX});const rh=hitbox(rockets[i]);if(overlaps(ph,rh)){burst(rockets[i].x,rockets[i].y,"#ffff00",12);rockets.splice(i,1);rocketsCollected++;score+=50;sfxCollect();continue;}if(rockets[i].x+rockets[i].w<0)rockets.splice(i,1);}
  for(let i=bullets.length-1;i>=0;i--){bullets[i].x+=bullets[i].vx;if(bullets[i].x>W){bullets.splice(i,1);continue;}let hit=false;for(let j=obstacles.length-1;j>=0;j--){const bh={x:bullets[i].x,y:bullets[i].y,w:BULLET[0].length*PX,h:BULLET.length*PX};const oh=hitbox(obstacles[j]);if(overlaps(bh,oh)){burst(obstacles[j].x+obstacles[j].w/2,obstacles[j].y+obstacles[j].h/2,"#ff4444",10);obstacles.splice(j,1);bullets.splice(i,1);hurdlesCleared++;score+=20;hit=true;break;}}if(hit)continue;}
  const ph=hitbox({x:player.x,y:player.y,w:SPACEMAN[0].length*PX,h:SPACEMAN.length*PX});
  for(const obs of obstacles){if(overlaps(ph,hitbox(obs))){sfxHit();burst(player.x,player.y,"#ff3333",15);state="dead";return;}}
  if(hurdlesCleared>=WIN_HURDLES&&rocketsCollected>=WIN_ROCKETS){sfxWin();state="win";}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;if(p.life<=0)particles.splice(i,1);}
  stars.forEach(s=>{s.x-=s.speed;if(s.x<0)s.x=W;});
}
function draw(){
  ctx.fillStyle="#0a0a1a";ctx.fillRect(0,0,W,H);
  stars.forEach(s=>{ctx.fillStyle=s.size===2?"#ffffff":"#6677aa";ctx.fillRect(s.x,s.y,s.size,s.size);});
  ctx.fillStyle="#1a1a3a";ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.fillStyle="#4f46e5";ctx.fillRect(0,GROUND,W,2);
  if(state==="start"){drawStartScreen();return;}
  if(state==="win"){drawWinScreen();return;}
  obstacles.forEach(o=>{drawSprite(o.sprite,o.x,o.y);ctx.fillStyle="#ff444488";ctx.font="bold 9px monospace";ctx.fillText(o.label,o.x,o.y-4);});
  rockets.forEach(r=>drawSprite(r.sprite,r.x,r.y));
  bullets.forEach(b=>drawSprite(BULLET,b.x,b.y));
  const sprite=player.jumping?SPACEMAN_JUMP:SPACEMAN;
  drawSprite(sprite,player.x,player.y);
  particles.forEach(p=>{ctx.globalAlpha=p.life/30;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);});
  ctx.globalAlpha=1;
  drawHUD();
  if(state==="dead")drawDeadScreen();
}
function drawHUD(){
  ctx.fillStyle="#a5b4fc";ctx.font="bold 13px monospace";
  ctx.fillText("SCORE: "+score,10,20);
  ctx.fillText("HURDLES: "+hurdlesCleared+"/"+WIN_HURDLES,10,36);
  ctx.fillText("ROCKETS: "+rocketsCollected+"/"+WIN_ROCKETS,10,52);
  const barW=200,progress=Math.min(1,(hurdlesCleared/WIN_HURDLES+rocketsCollected/WIN_ROCKETS)/2);
  ctx.fillStyle="#1f2937";ctx.fillRect(W-barW-10,10,barW,12);
  ctx.fillStyle="#4f46e5";ctx.fillRect(W-barW-10,10,barW*progress,12);
  ctx.fillStyle="#a5b4fc";ctx.font="10px monospace";ctx.fillText("LAUNCH PROGRESS",W-barW-10,34);
}
function drawStartScreen(){
  ctx.fillStyle="#a5b4fc";ctx.font="bold 32px monospace";ctx.textAlign="center";
  ctx.fillText("SPACE MAN",W/2,H/2-40);
  ctx.font="14px monospace";ctx.fillStyle="#6b7280";
  ctx.fillText("Help Space Man overcome obstacles and collect rockets",W/2,H/2);
  ctx.fillText("to blast off and colonize a new world!",W/2,H/2+20);
  ctx.fillStyle="#4f46e5";ctx.font="bold 16px monospace";
  ctx.fillText("PRESS SPACE TO LAUNCH",W/2,H/2+55);
  ctx.textAlign="left";
  drawSprite(SPACEMAN,W/2-15,H/2-120);
}
function drawDeadScreen(){
  ctx.fillStyle="rgba(10,10,26,0.75)";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#ff4444";ctx.font="bold 28px monospace";ctx.textAlign="center";
  ctx.fillText("MISSION FAILED",W/2,H/2-20);
  ctx.fillStyle="#a5b4fc";ctx.font="13px monospace";
  ctx.fillText("Score: "+score+" | Hurdles: "+hurdlesCleared+" | Rockets: "+rocketsCollected,W/2,H/2+10);
  ctx.fillStyle="#4f46e5";ctx.font="bold 15px monospace";
  ctx.fillText("PRESS SPACE TO TRY AGAIN",W/2,H/2+40);
  ctx.textAlign="left";
}
function drawWinScreen(){
  ctx.fillStyle="#0a0a1a";ctx.fillRect(0,0,W,H);
  stars.forEach(s=>{ctx.fillStyle="#ffffff";ctx.fillRect(s.x,s.y,s.size+1,s.size+1);});
  [{x:600,y:40},{x:650,y:100},{x:680,y:20},{x:720,y:70},{x:740,y:130}].forEach(pos=>drawSprite(ROCKET_SPRITE,pos.x,pos.y));
  drawSprite(WIN_ROCKET,W/2-18,60);
  ctx.fillStyle="#a0c8ff";ctx.font="18px monospace";ctx.textAlign="center";
  ctx.fillText("😊",W/2-1,110);
  ctx.fillStyle="#ffff00";ctx.font="bold 26px monospace";ctx.fillText("MISSION COMPLETE!",W/2,220);
  ctx.fillStyle="#a5b4fc";ctx.font="13px monospace";
  ctx.fillText("Space Man has colonized a new world!",W/2,245);
  ctx.fillText("Final Score: "+score,W/2,265);
  ctx.fillStyle="#4f46e5";ctx.font="bold 13px monospace";
  ctx.fillText("PRESS ENTER TO PLAY AGAIN",W/2,290);
  ctx.textAlign="left";
}
function loop(){update();draw();requestAnimationFrame(loop);}
loop();
