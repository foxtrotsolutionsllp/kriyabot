"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { AssistantCorner } from "@/components/AssistantCorner";

type Theme = { font_family?: string; font_size?: number; colors?: Record<string, string> };
type Props = { user: { name?: string; email?: string; role_assignments?: Array<{ role?: { name?: string } }>; preferences?: { theme?: Theme; notify_browser?: boolean; assistant_name?: string; assistant_language?: "en-IN" | "hi-IN"; avatar?: string | null } } };
const links = [
  { href: "/app", label: "Overview", icon: "overview" },
  { href: "/app/tasks", label: "My work", icon: "work", badge: "" },
  { href: "/app/projects", label: "Projects", icon: "projects" },
  { href: "/app/calendar", label: "Calendar", icon: "calendar" },
  { href: "/app/trash", label: "Trash", icon: "trash" },
  { href: "/app/assistant", label: "AI assistant", icon: "assistant" },
] as const;
const collaborationLinks = [
  { href: "/app/people", label: "People", icon: "people" },
  { href: "/app/messages", label: "Messages", icon: "messages" },
  { href: "/app/files", label: "Files", icon: "files" },
] as const;
const adminLink = { href: "/admin", label: "Users", icon: "people" } as const;

function Icon({ name }: { name: string }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></>,
    work: <><path d="M8 5h11a2 2 0 0 1 2 2v13H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1"/><path d="M8 3h8v4H8zM8 12h9M8 16h6"/><path d="m3 11 1.5 1.5L7 10"/></>,
    projects: <><path d="M3 7.5h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7V5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3"/></>,
    people: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7.5" r="4"/><path d="M17 11a4 4 0 0 0 0-7.8M21 20v-1.5a4 4 0 0 0-3-3.9"/></>,
    messages: <><path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 21 11.5Z"/><path d="M8 11h8M8 14h5"/></>,
    files: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7M8 14h8M8 17h6"/></>,
    profile: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0M19 5l1 1 2-2"/></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6"/><path d="m5 7 1 13h12l1-13M9 7V4h6v3"/></>,
    assistant: <><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.2 7.7l2.1-2.1"/><path d="M8 14a4 4 0 1 1 8 0c0 2-1 2-1 4h-6c0-2-1-2-1-4ZM9 21h6"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export function TaskFlowShell({ children, user }: React.PropsWithChildren<Props>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSuperAdmin = user.role_assignments?.some(assignment => assignment.role?.name === "super_admin") ?? false;
  const [theme, setTheme] = useState<Theme>(user.preferences?.theme ?? {});
  useEffect(() => {
    const preview = (event: Event) => setTheme((event as CustomEvent<Theme>).detail ?? {});
    window.addEventListener("taskflow:theme-preview", preview);
    return () => window.removeEventListener("taskflow:theme-preview", preview);
  }, []);
  const fontFamilies: Record<string, string> = { system: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif', Aptos: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif', Tahoma: 'Tahoma, "Segoe UI", sans-serif', Georgia: 'Georgia, serif', Verdana: 'Verdana, sans-serif' };
  const themeStyle = {
    "--tf-accent": theme.colors?.accent ?? "#655cdd",
    "--tf-heading": theme.colors?.heading ?? "#292d40",
    "--tf-text": theme.colors?.text ?? "#42475a",
    "--tf-background": theme.colors?.background ?? "#f6f7fb",
    "--tf-surface": theme.colors?.surface ?? "#ffffff",
    "--tf-font-family": fontFamilies[theme.font_family ?? "system"] ?? fontFamilies.system,
    "--tf-font-scale": String(((theme.font_size ?? 16) / 16) * 1.16),
  } as CSSProperties;
  const initials = (user.name ?? user.email ?? "TF").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <div className="app-frame" style={themeStyle}>
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <Link className="brand-lockup" href="/app" onClick={() => setMobileOpen(false)} aria-label="Kriyabot home"><img src="/kriyabot-logo.png" alt="Kriyabot" /></Link>
      <div className="sidebar-scroll">
        <div className="workspace-switcher"><span className="workspace-avatar">W</span><span className="workspace-label"><b>Workspace</b><small>Current workspace</small></span><span className="switch-caret">⌄</span></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="nav-list" aria-label="Workspace navigation">{links.map(item => { const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-link ${active ? "nav-link-active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span>{active && <span className="active-indicator"/>}</Link>; })}</nav>
        <p className="nav-caption nav-caption-spaced">COLLABORATE</p>
        <nav className="nav-list" aria-label="Collaboration navigation">{collaborationLinks.map(item => { const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-link ${active ? "nav-link-active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span>{active && <span className="active-indicator"/>}</Link>; })}</nav>
        {isSuperAdmin && <><p className="nav-caption nav-caption-spaced">ADMINISTRATION</p><nav className="nav-list" aria-label="Super Admin navigation"><Link href={adminLink.href} onClick={() => setMobileOpen(false)} className={`nav-link ${pathname.startsWith("/admin") ? "nav-link-active" : ""}`} aria-current={pathname.startsWith("/admin") ? "page" : undefined}><Icon name={adminLink.icon}/><span>{adminLink.label}</span>{pathname.startsWith("/admin") && <span className="active-indicator"/>}</Link></nav></>}
        <div className="help-card"><span className="help-spark">✦</span><b>One step at a time</b><p>Keep your next priority close and your bigger goals in view.</p><Link href="/app/tasks" onClick={() => setMobileOpen(false)}>Open my work <span>→</span></Link></div>
      </div>
    </aside>
      <div className="app-main"><header className="app-topbar"><button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><span/><span/><span/></button><Link className="mobile-brand" href="/app" aria-label="Kriyabot home"><img src="/kriyabot-logo.png" alt="Kriyabot"/></Link><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><b>{pathname === "/app" ? "Overview" : pathname.startsWith("/admin") ? "Users" : links.find(item => item.href !== "/app" && pathname.startsWith(item.href))?.label ?? collaborationLinks.find(item => pathname.startsWith(item.href))?.label ?? "Workspace"}</b></div><div className="topbar-right"><AssistantCorner userName={user.name ?? "there"} initialAssistantName={user.preferences?.assistant_name} initialAssistantLanguage={user.preferences?.assistant_language}/><NotificationBell enabled={!!user.preferences?.notify_browser}/><span className="status-pill"><span/> Workspace ready</span><AccountMenu name={user.name} email={user.email} avatar={user.preferences?.avatar}/></div></header><main className="main-content">{children}</main></div>
  </div>;
}

function NotificationBell({enabled}:{enabled:boolean}) {
  type Item={id:number;title:string;body:string;data?:{url?:string};read_at?:string|null};
  const [items,setItems]=useState<Item[]>([]),[open,setOpen]=useState(false),[portalReady,setPortalReady]=useState(false),[browserEnabled,setBrowserEnabled]=useState(enabled),[pushSubscribed,setPushSubscribed]=useState(false),[pushStatus,setPushStatus]=useState("");
  const known=useRef(new Set<number>()),initialized=useRef(false),popoverRef=useRef<HTMLDivElement>(null),popoverPanelRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setPortalReady(true)},[]);
  useEffect(()=>{if(!open)return;const closeOutside=(event:PointerEvent)=>{const target=event.target as Node;if(!popoverRef.current?.contains(target)&&!popoverPanelRef.current?.contains(target))setOpen(false)};const closeEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('pointerdown',closeOutside);document.addEventListener('keydown',closeEscape);return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',closeEscape)}},[open]);
  const subscribeForPush=useCallback(async():Promise<boolean>=>{
    if(!('serviceWorker'in navigator)||!('Notification'in window))return false;
    try{
      const registration=await navigator.serviceWorker.register('/sw.js');
      if(!registration.pushManager)return false;
      const keyResponse=await fetch('/api/backend/notifications/push/key',{cache:'no-store'});const keyData=await keyResponse.json();
      if(!keyResponse.ok||!keyData.configured||!keyData.public_key)return false;
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeVapidKey(keyData.public_key)});
      const response=await fetch('/api/backend/notifications/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(subscription.toJSON())});
      if(!response.ok)throw new Error('Your device could not be registered for background alerts.');
      setPushSubscribed(true);return true;
    }catch(error){setPushStatus(error instanceof Error?error.message:'Background alerts could not be enabled.');return false;}
  },[]);
  useEffect(()=>{setBrowserEnabled(enabled);if(enabled&&'Notification'in window&&Notification.permission==='granted')void subscribeForPush().then(ok=>{if(!ok)setPushStatus('Background push is not configured yet. Alerts will appear while Kriyabot is open.');});},[enabled,subscribeForPush]);
  useEffect(()=>{let active=true;const refresh=async()=>{try{const response=await fetch('/api/backend/notifications',{cache:'no-store'});if(!response.ok)return;const data=await response.json();const next=Array.isArray(data)?data as Item[]:[];if(initialized.current&&browserEnabled&&!pushSubscribed&&'Notification'in window&&Notification.permission==='granted')for(const item of next){if(!known.current.has(item.id)&&!item.read_at){const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.showNotification(item.title,{body:item.body,tag:`taskflow-${item.id}`,data:{url:item.data?.url??'/app'}});else new Notification(item.title,{body:item.body});}}known.current=new Set(next.map(item=>item.id));initialized.current=true;if(active)setItems(next);}catch{}};void refresh();const timer=window.setInterval(refresh,30000);return()=>{active=false;window.clearInterval(timer)}},[browserEnabled,pushSubscribed]);
  async function enableBrowserAlerts(){
    if(!('Notification'in window)){setPushStatus('This browser does not support system notifications.');return;}
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted'){setPushStatus('Allow notifications for Kriyabot in your browser settings, then try again.');return;}
    setBrowserEnabled(true);
    const response=await fetch('/api/backend/me',{method:'PATCH',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({preferences:{notify_browser:true}})});
    if(!response.ok){setBrowserEnabled(false);setPushStatus('The browser allowed notifications, but Kriyabot could not save your preference.');return;}
    const subscribed=await subscribeForPush();
    setPushStatus(subscribed?'Background alerts are enabled on this device.':"On-screen alerts are enabled while Kriyabot is open. Background delivery needs HTTPS and server push keys.");
  }
  async function disableBrowserAlerts(){
    try{const registration=await navigator.serviceWorker?.getRegistration();const subscription=await registration?.pushManager.getSubscription();if(subscription){await fetch('/api/backend/notifications/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe();}}catch{}
    const response=await fetch('/api/backend/me',{method:'PATCH',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({preferences:{notify_browser:false}})});
    if(response.ok){setBrowserEnabled(false);setPushSubscribed(false);setPushStatus('Browser alerts are off.');}
  }
  const unread=items.filter(item=>!item.read_at).length;
  const alertAction=()=>browserEnabled&&pushSubscribed?disableBrowserAlerts():enableBrowserAlerts();
  const alertLabel=!browserEnabled?'Enable alerts':pushSubscribed?'Turn alerts off':'Set up this device';
  return <div className="notification-bell-wrap" ref={popoverRef}><button className={`notification-bell ${unread?'notification-bell-unread':'notification-bell-clear'}`} aria-label={unread?`${unread} unread notifications`:'No unread notifications'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{unread>0&&<i>{unread>9?'9+':unread}</i>}</button>{open&&portalReady&&createPortal(<div ref={popoverPanelRef} className="notification-popover" role="dialog" aria-label="Reminders and alerts"><header><b>Reminders & alerts</b><button onClick={alertAction}>{alertLabel}</button></header>{pushStatus&&<p className="notification-status">{pushStatus}</p>}{items.length?items.slice(0,8).map(item=><a key={item.id} href={item.data?.url??'/app'} className={!item.read_at?'notification-unread':''} onClick={()=>{void fetch(`/api/backend/notifications/${item.id}/read`,{method:'POST'});setItems(old=>old.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row));setOpen(false)}}><b>{item.title}</b><span>{item.body}</span></a>):<p>No reminders yet. Upcoming task deadlines and meeting alerts will appear here.</p>}</div>,document.body)}</div>
}

function decodeVapidKey(value:string):ArrayBuffer{const padding='='.repeat((4-value.length%4)%4);const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=window.atob(base64);const bytes=Uint8Array.from(raw,character=>character.charCodeAt(0));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;}
