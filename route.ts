import {NextRequest,NextResponse} from 'next/server';
import {admin} from '@/lib/admin';
import {isMcGill,validateProfile,Profile} from '@/lib/model';
export const runtime='nodejs';
export async function POST(req:NextRequest,ctx:{params:Promise<{action:string[]}>}){
 try{
 const {auth,db}=admin();const bearer=req.headers.get('authorization');if(!bearer?.startsWith('Bearer '))return NextResponse.json({error:'Please log in again.'},{status:401});
 const token=await auth.verifyIdToken(bearer.slice(7),true);if(!token.email_verified||!token.email||!isMcGill(token.email))return NextResponse.json({error:'Verify your McGill email first.'},{status:403});
 const uid=token.uid;const route=(await ctx.params).action.join('/');const b=await req.json();const account=db.doc(`accounts/${uid}`);
 if(route==='register'){
 if(b.consent!==true)return NextResponse.json({error:'Agree to Privacy policy and Terms of use to join.'},{status:400});
 await db.runTransaction(async tx=>{const a=await tx.get(account);if(!a.exists){tx.create(account,{email:token.email,consentVersion:'2026-10-v1-placeholder',consentedAt:Date.now()});tx.create(db.doc(`events/O1_${uid}`),{type:'O1',uid,at:Date.now()});}});return NextResponse.json({ok:true});}
 if(!(await account.get()).exists)return NextResponse.json({error:'Please join and agree to the terms first.'},{status:403});
 if(route==='profile'){
 const p:Profile={uid,name:String(b.name||'').trim(),program:String(b.program||'').trim(),year:String(b.year||''),interests:Array.isArray(b.interests)?b.interests:[],values:Array.isArray(b.values)?b.values:[],looking:b.looking,availability:Array.isArray(b.availability)?b.availability:[],instagram:String(b.instagram||'').replace(/^@/,''),sharePhone:b.sharePhone===true,phone:b.sharePhone?String(b.phone||''):'',completed:true,currentMatch:null};
 const errors=validateProfile(p);if(Object.keys(errors).length)return NextResponse.json({error:'Check the highlighted fields.',fields:errors},{status:400});
 await db.runTransaction(async tx=>{const ref=db.doc(`profiles/${uid}`);const old=await tx.get(ref);if(old.exists)throw new Error('Your profile is already saved. Contact the team to request a change.');tx.create(ref,p);tx.create(db.doc(`events/O2_${uid}`),{type:'O2',uid,at:Date.now()});});return NextResponse.json({ok:true});}
 if(route==='decision'){
 if(!/^[\w-]+$/.test(b.id)||!['accept','pass'].includes(b.decision))return NextResponse.json({error:'Invalid decision.'},{status:400});
 await db.runTransaction(async tx=>{const ref=db.doc(`matches/${b.id}`);const snap=await tx.get(ref);const m=snap.data();if(!m||!m.members.includes(uid))throw new Error('Match not found.');if(m.decisions[uid]!=='pending'){if(m.decisions[uid]===b.decision)return;throw new Error('Your decision is already saved.');}tx.update(ref,{[`decisions.${uid}`]:b.decision});tx.create(db.doc(`events/O3_${b.id}_${uid}`),{type:'O3',uid,matchId:b.id,decision:b.decision,at:Date.now()});});return NextResponse.json({ok:true});}
 if(route==='report'){
 if(typeof b.message!=='string'||!b.message.trim()||b.message.length>3000)return NextResponse.json({error:'Add a message of up to 3,000 characters.'},{status:400});
 // One open report per member is an explicit bound on automated writes.
 await db.doc(`reports/${uid}`).set({uid,message:b.message.trim(),at:Date.now(),status:'open'});return NextResponse.json({ok:true});}
 return NextResponse.json({error:'Not found.'},{status:404});
 }catch(e){console.error('Request failed:',e instanceof Error?e.message:'Unknown error');return NextResponse.json({error:'Could not save this right now. Your answers are still here. Try again.'},{status:400});}
}
