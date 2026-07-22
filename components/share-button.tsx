"use client";
export function ShareButton(){async function share(){if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);alert("链接已复制")}}return <button className="btn-secondary" type="button" onClick={share}>分享链接</button>}
