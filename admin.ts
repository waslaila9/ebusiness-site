import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
export function admin(){
 const projectId=process.env.FIREBASE_PROJECT_ID,clientEmail=process.env.FIREBASE_CLIENT_EMAIL,privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!projectId||!clientEmail||!privateKey)throw new Error('Server Firebase credentials are missing.');
 const app=getApps()[0]||initializeApp({credential:cert({projectId,clientEmail,privateKey})});return {auth:getAuth(app),db:getFirestore(app)};
}
