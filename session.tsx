'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {onAuthStateChanged,signOut} from 'firebase/auth';
import {auth,demo,incomplete} from './firebase';
import {User,isMcGill} from './model';
import {local,write} from './client';
const Context=createContext<{user:User|null;ready:boolean;logout:()=>Promise<void>}>({user:null,ready:false,logout:async()=>{}});
export const useSession=()=>useContext(Context);
export function Session({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{if(demo){const load=()=>{try{setUser(current=>{const next=local().user;return current?.uid===next?.uid&&current?.email===next?.email?current:next;});}catch{setUser(current=>current?null:current);}setReady(current=>current?current:true);};load();window.addEventListener('demo-auth',load);window.addEventListener('storage',load);return()=>{window.removeEventListener('demo-auth',load);window.removeEventListener('storage',load);};}if(incomplete){setReady(true);return;}return onAuthStateChanged(auth!,u=>{const next=u&&u.emailVerified&&u.email&&isMcGill(u.email)?{uid:u.uid,email:u.email}:null;setUser(current=>current?.uid===next?.uid&&current?.email===next?.email?current:next);setReady(current=>current?current:true);});},[]);
 const logout=useCallback(async()=>{if(demo){const s=local();s.user=null;write(s);}else await signOut(auth!);window.location.assign('/');},[]);
 const value=useMemo(()=>({user,ready,logout}),[user,ready,logout]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
