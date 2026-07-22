"use client";
import { useRouter } from "next/navigation";
export function LogoutButton(){const router=useRouter();async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.push("/");router.refresh()}return <button className="text-sm text-slate-500" type="button" onClick={logout}>退出</button>}
