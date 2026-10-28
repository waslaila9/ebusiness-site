'use client';
import {createContext,useContext,useEffect,useState,ReactNode} from 'react';
import {onAuthStateChanged,signOut} from 'firebase/auth';
import {auth,demo,incomplete} from '@/lib/firebase';
import {User,isMcGill} from '@/lib/model';
import {local,write} from '@/lib/client';
const Context=createContext<{user:User|null;ready:boolean;logout:()=>Promise<void>}>({user:null,ready:false,logout:async()=>{}});
export const useSession=()=>useContext(Context);
export function Session({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{if(demo){const load=()=>{try{setUser(local().user);}catch{setUser(null);}setReady(true);};load();window.addEventListener('demo-auth',load);window.addEventListener('storage',load);return()=>{window.removeEventListener('demo-auth',load);window.removeEventListener('storage',load);};}if(incomplete){setReady(true);return;}return onAuthStateChanged(auth!,u=>{setUser(u&&u.emailVerified&&u.email&&isMcGill(u.email)?{uid:u.uid,email:u.email}:null);setReady(true);});},[]);
 async function logout(){if(demo){const s=local();s.user=null;write(s);}else await signOut(auth!);window.location.assign('/');}
 return <Context.Provider value={{user,ready,logout}}>{children}</Context.Provider>;
}
