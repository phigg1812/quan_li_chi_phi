'use strict';
const demoStorage = {
  getItem(key){ return sessionStorage.getItem('so-theo-doi-preview:'+key); },
  setItem(key,value){ sessionStorage.setItem('so-theo-doi-preview:'+key,value); },
  removeItem(key){ sessionStorage.removeItem('so-theo-doi-preview:'+key); }
};
(() => {
  const user={uid:'preview',displayName:'Bạn',email:'demo@example.invalid',providerData:[]};
  const data=new Map();
  const bucket=name=>{
    if(!data.has(name))data.set(name,new Map());
    return data.get(name);
  };
  const ref=(name,id)=>({name,id});
  const snapshot=(doc,value)=>({id:doc.id,ref:doc,exists:()=>value!==undefined,data:()=>structuredClone(value)});
  const apply=(doc,value)=>{
    if(value===undefined)bucket(doc.name).delete(doc.id);
    else bucket(doc.name).set(doc.id,structuredClone(value));
  };
  function batch(){
    const operations=[];
    return {set:(doc,value)=>operations.push([doc,value]),delete:doc=>operations.push([doc]),commit:async()=>{
      for(const [doc,value] of operations)apply(doc,value);
    }};
  }
  window.FB={
    currentUser:user,auth:{currentUser:user},db:null,
    collection:(_,root,uid,name)=>name,doc:(_,root,uid,name,id)=>ref(name,id),
    getDocs:async name=>[...bucket(name)].map(([id,value])=>snapshot(ref(name,id),value)),
    setDoc:async (doc,value)=>apply(doc,value),deleteDoc:async doc=>apply(doc),writeBatch:batch,
    runTransaction:async (_,run)=>{
      const pending=batch();pending.get=async doc=>snapshot(doc,bucket(doc.name).get(doc.id));
      const result=await run(pending);await pending.commit();return result;
    },
    updateProfile:async (profile,values)=>Object.assign(profile,values),
    updatePassword:async ()=>{throw new Error('Bản demo dùng tài khoản mẫu.');}
  };
  const signin=()=>{
    FB.currentUser=FB.auth.currentUser=user;
    return window.onFirebaseAuthChange(user);
  };
  window.fbGoogleSignIn=window.fbEmailSignIn=window.fbEmailSignUp=signin;
  window.fbSignOut=()=>{
    FB.currentUser=FB.auth.currentUser=null;
    return window.onFirebaseAuthChange(null);
  };
  window.fbResetPassword=async ()=>{throw new Error('Bản demo dùng tài khoản mẫu.');};
  window.getAuthErrorMessage=()=> 'Bản demo dùng tài khoản mẫu.';
  document.addEventListener('DOMContentLoaded',()=>{
    const date=todayISO(), y=date.slice(0,4), m=date.slice(5,7);
    const day=n=>y+'-'+m+'-'+String(n).padStart(2,'0');
    const shifted=(month,day)=>dateISO(new Date(Number(y),Number(m)-1+month,day));
    const add=(id,name,amount,categoryId,createdDate,dueDate,paid)=>{
      apply(ref('expenses',id),{id,name,amount,categoryId,createdDate,dueDate,paid,createdAt:Date.parse(createdDate),
        walletId:'wal_personal',paymentMethodId:'pm_transfer',notes:''});
    };
    add('demo-meal','Đi chợ và ăn uống',700000,'cat_food',day(11),day(11),true);
    add('demo-home','Mua đồ gia dụng',1000000,'cat_shopping',day(15),day(15),true);
    add('demo-weekend','Siêu thị cuối tuần',470000,'cat_food',day(22),day(22),true);
    add('demo-electricity','Tiền điện',350000,'cat_bill',day(19),day(19),false);
    add('demo-dues','Phí quản lý',250000,'cat_housing',date,date,false);
    add('demo-net','Internet',220000,'cat_bill',date,shifted(0,Number(date.slice(8))+3),false);
    add('demo-rent','Tiền nhà',1320000,'cat_housing',date,shifted(0,Number(date.slice(8))+12),false);
    for(let offset=-5;offset<0;offset++){
      add('demo-past-'+offset,'Sinh hoạt tháng',3500000+offset*245000,'cat_housing',shifted(offset,12),shifted(offset,12),true);
    }
    apply(ref('settings','app'),{key:'app',language:'vi',currency:'VND',theme:'light',budgets:{total:5000000,cats:{cat_food:1600000,cat_shopping:1300000}}});
    apply(ref('backups','preview-backup'),{id:'preview-backup',filename:'SoTheoDoi_Mau.json',createdAt:Date.now(),count:bucket('expenses').size});
    for(const [id,person,scope,amount] of [['gift1','Minh Anh','couple',1000000],['gift2','Quốc Huy','personal',700000],['gift3','Khánh Linh','partner',500000]]){
      apply(ref('envelopes',id),{id,person,scope,amount,direction:'received',event:'Đám cưới',date:day(10),notes:'',createdAt:Date.parse(date),
        ...(id==='gift3'?{reciprocal:{event:'Sinh nhật',date:'',notes:'',amount:500000}}:{})});
    }
    signin();
  });
})();
