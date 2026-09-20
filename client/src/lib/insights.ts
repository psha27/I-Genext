import { useEffect,useState } from 'react'
export type Insight={id:string;slug:string;title:string;topic:string;summary:string;author:string;body:[string,string][];imageUrl:string;status:'draft'|'published';version:number;readMinutes:number;publishedAt:string|null;updatedAt:string}
export function useInsights(){
  const [articles,setArticles]=useState<Insight[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true);setError('')
    fetch('/api/insights',{signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error()
      const result=await response.json();setArticles(result.rows)
    }).catch(e=>{if(e.name!=='AbortError'){setArticles([]);setError('Perspectives could not be loaded. Please try again.')}}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[refresh])
  useEffect(()=>{
    const update=()=>setRefresh(x=>x+1)
    window.addEventListener('focus',update);window.addEventListener('igenext:insights-changed',update)
    return()=>{window.removeEventListener('focus',update);window.removeEventListener('igenext:insights-changed',update)}
  },[])
  return {articles,loading,error,reload:()=>setRefresh(x=>x+1)}
}
