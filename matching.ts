import {Profile,Match,cardOf} from './model';
export function reasons(a:Profile,b:Profile){return {sharedInterests:[...new Set(a.interests)].filter(x=>b.interests.includes(x)),sharedAvailability:[...new Set(a.availability)].filter(x=>b.availability.includes(x))};}
export function score(a:Profile,b:Profile){if(a.uid===b.uid||a.looking!==b.looking)return -1;const r=reasons(a,b);return r.sharedInterests.length+r.sharedAvailability.length;}
// Recompute each remaining person's best choice after mutual pairs are removed.
// Stable UID tie-breaking makes every run deterministic.
export function pairProfiles(profiles:Profile[]):Match[]{
 let remaining=profiles.filter(p=>p.completed&&!p.currentMatch).sort((a,b)=>a.uid.localeCompare(b.uid));const result:Match[]=[];
 while(remaining.length>1){
 const best=new Map<string,string>();
 for(const a of remaining){const candidates=remaining.filter(b=>score(a,b)>=0).sort((b,c)=>score(a,c)-score(a,b)||b.uid.localeCompare(c.uid));if(candidates[0])best.set(a.uid,candidates[0].uid);}
 const used=new Set<string>();
 for(const a of remaining){const b=remaining.find(p=>p.uid===best.get(a.uid));if(!b||used.has(a.uid)||used.has(b.uid)||best.get(b.uid)!==a.uid)continue;
 const members=[a.uid,b.uid].sort();result.push({id:`${members[0]}_${members[1]}`,members,cards:{[a.uid]:cardOf(a),[b.uid]:cardOf(b)},decisions:{[a.uid]:'pending',[b.uid]:'pending'},...reasons(a,b),createdAt:Date.now()});used.add(a.uid);used.add(b.uid);}
 if(!used.size)break;remaining=remaining.filter(p=>!used.has(p.uid));
 }return result;
}
