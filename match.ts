import {admin} from './admin';import {pairProfiles} from './matching';import {Profile} from './model';
async function main(){
const {db}=admin();
const count=await db.runTransaction(async tx=>{
 // Query read participates in transaction conflict detection; profile pointers
 // and every match/card/job are committed together.
 const snap=await tx.get(db.collection('profiles'));
 if(snap.size>200)throw new Error('This class-project runner supports at most 200 profiles per batch.');
 const profiles=snap.docs.map(d=>d.data() as Profile);const pairs=pairProfiles(profiles);
 for(const pair of pairs){tx.create(db.doc(`matches/${pair.id}`),pair);for(const uid of pair.members){tx.update(db.doc(`profiles/${uid}`),{currentMatch:pair.id});tx.create(db.doc(`mailJobs/${pair.id}_${uid}`),{uid,matchId:pair.id,status:'pending',createdAt:Date.now(),demo:uid.startsWith('demo-')});}}
 return pairs.length;
});console.log(`Created ${count} mutual matches. Run npm run notify to deliver pending match emails.`);
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
