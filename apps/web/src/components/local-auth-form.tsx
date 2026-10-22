import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { authClient } from '@/services/auth-client.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import '@/layouts/main-layout/life-hud-shell.css';
export default function LocalAuthForm({mode}:{mode:'sign-in'|'sign-up'|'forgot'|'reset'}) {
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);
 const title=({'sign-in':'登录','sign-up':'创建本地账户',forgot:'重置密码',reset:'设置新密码'})[mode];
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError('');const values=new FormData(event.currentTarget);
  const email=String(values.get('email')||'');const password=String(values.get('password')||'');
  try {
   let result;
   if(mode==='sign-in')result=await authClient.signIn.email({email,password});
   else if(mode==='sign-up')result=await authClient.signUp.email({email,password,name:String(values.get('name')||'')});
   else if(mode==='forgot')result=await authClient.requestPasswordReset({email,redirectTo:window.location.origin+'/reset-password'});
   else {const token=new URL(window.location.href).searchParams.get('token')||'';result=await authClient.resetPassword({newPassword:password,token});}
   if(result.error){setError(mode==='sign-in'?'登录失败，请检查账户、密码和本地服务。':'请求未完成，请检查输入和本地服务。');return;}
   if(mode==='sign-in'||mode==='sign-up')window.location.assign('/app');else setDone(true);
  }catch{setError('本地服务暂不可用，请稍后重试。');}finally{setBusy(false);}
 }
 return <main className="hud" style={{padding:'clamp(24px,8vw,100px)',alignItems:'center'}}><section className="w-full max-w-sm"><p className="hud-brand mb-8">LIFE HUD</p><h1 className="text-2xl mb-6">{title}</h1>{done?<p role="status">{mode==='forgot'?'若账户存在，请在本地邮件预览中查看重置链接。':'密码已更新，请重新登录。'}</p>:<form onSubmit={event=>{void submit(event);}} className="flex flex-col gap-4">
 {mode==='sign-up'&&<><Label htmlFor="name">称呼</Label><Input id="name" name="name" required maxLength={128} autoComplete="name" /></>}
 {mode!=='reset'&&<><Label htmlFor="email">邮箱</Label><Input id="email" name="email" type="email" required autoComplete="email" /></>}
 {mode!=='forgot'&&<><Label htmlFor="password">密码</Label><Input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode==='sign-in'?'current-password':'new-password'} /></>}
 {error&&<p role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy?'处理中…':title}</Button></form>}<div className="flex gap-4 mt-6"><Link to="/">返回</Link>{mode==='sign-in'?<><Link to="/sign-up">注册</Link><Link to="/forgot-password">忘记密码</Link></>:<Link to="/sign-in">登录</Link>}</div></section></main>;
}
