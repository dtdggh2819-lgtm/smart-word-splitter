'use client';
import {useState} from 'react';

type Entity = '人名'|'地名'|'机构'|'品牌'|'产品'|'作品'|'事件'|'其他实体'|'非实体'|'待核验';
type Token = {word:string;pos:string;entityType:Entity;detail:string;reason:string;uncertain:boolean};
const categories:Entity[]=['非实体','人名','地名','机构','品牌','产品','作品','事件','其他实体','待核验'];
const samples=['瑞丽是缅甸边境的一个国家','我买了一本瑞丽杂志','我今天买了一辆理想汽车','苹果发布了新产品'];
function csvCell(s:string){return '"'+s.replace(/"/g,'""')+'"';}
export default function Home(){
  const [text,setText]=useState(samples[0]);
  const [mode,setMode]=useState<'fast'|'precise'>('precise');
  const [tokens,setTokens]=useState<Token[]>([]);
  const [note,setNote]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [edits,setEdits]=useState(0);
  async function analyze(){
    setError('');setTokens([]);setNote('');setEdits(0);
    if(!text.trim()){setError('请先输入需要分析的文本。');return;}
    setLoading(true);
    try{
      const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,mode})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||'分析失败');
      setTokens(j.tokens);setNote(j.note||'');
    }catch(e){setError(e instanceof Error?e.message:'请求失败');}
    finally{setLoading(false);}
  }
  function change(i:number,value:Entity){setTokens(prev=>prev.map((t,j)=>j===i?{...t,entityType:value,uncertain:value==='待核验',reason:'用户手动修正'}:t));setEdits(n=>n+1);}
  function exportCsv(){
    const rows=[['词语','词性','实体分类','细分类','判断依据','待核验'],...tokens.map(t=>[t.word,t.pos,t.entityType,t.detail,t.reason,t.uncertain?'是':'否'])];
    const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='拆词结果.csv';a.click();URL.revokeObjectURL(url);
  }
  return <main className="shell">
    <header className="top"><div className="brand"><span className="logo">词</span><span>智能拆词助手 <small>Smart Word Splitter</small></span></div><span className="pill">独立网页版 · V1</span></header>
    <section className="hero"><span className="eyebrow">AI LANGUAGE INTELLIGENCE</span><h1>不止拆词，更懂语境。</h1><p>中文分词 · 词性标注 · 地名人名消歧 · 结果可编辑</p></section>
    <section className="panel"><div className="section-head"><h2>输入文本</h2><span>{text.length} / 3000 字</span></div>
      <textarea aria-label="待拆词文本" maxLength={3000} value={text} onChange={e=>setText(e.target.value)} placeholder="输入需要拆词的中文句子…"/>
      <div className="examples">试试示例：{samples.map((s,i)=><button type="button" key={i} onClick={()=>setText(s)}>{i+1}. {s}</button>)}</div>
      <div className="actions"><div className="modes"><button className={mode==='fast'?'active':''} onClick={()=>setMode('fast')}>快速模式</button><button className={mode==='precise'?'active':''} onClick={()=>setMode('precise')}>精准模式</button></div><button className="primary" disabled={loading||!text.trim()} onClick={analyze}>{loading?'正在识别…':'开始智能拆词 →'}</button></div>
      {error&&<p className="error" role="alert">{error}</p>}
    </section>
    <section className="panel result"><div className="section-head"><div><h2>识别结果</h2><p className="muted">点击分类可修正；修改仅保存在当前页面，尚未持久化。</p></div>{tokens.length>0&&<button className="outline" onClick={exportCsv}>导出 CSV ↓</button>}</div>
      {tokens.length===0?<div className="empty">输入文本后点击「开始智能拆词」，这里会显示结构化识别结果。</div>:<>
      <div className="stats"><span>词语 <b>{tokens.length}</b></span><span>命名实体 <b>{tokens.filter(t=>t.entityType!=='非实体'&&t.entityType!=='待核验').length}</b></span><span>待核验 <b>{tokens.filter(t=>t.uncertain).length}</b></span><span>本次纠正 <b>{edits}</b></span></div>
      <div className="tablewrap"><table><thead><tr><th>#</th><th>词语</th><th>词性</th><th>实体分类（可编辑）</th><th>说明 / 识别依据</th></tr></thead><tbody>{tokens.map((t,i)=><tr key={i}><td className="muted">{i+1}</td><td className="word">{t.word===' '? '␣':t.word==='\n'?'↵':t.word}</td><td>{t.pos}</td><td><select aria-label={t.word+'的实体分类'} value={t.entityType} onChange={e=>change(i,e.target.value as Entity)}>{categories.map(c=><option key={c}>{c}</option>)}</select></td><td className="reason">{t.detail&&<span className="tag">{t.detail}</span>}{t.reason||'—'}{t.uncertain&&<span className="warn"> 待核验</span>}</td></tr>)}</tbody></table></div>
      {note&&<p className="note">💡 {note}</p>}
      </>}
    </section>
    <footer>词性与实体识别由 AI 辅助完成，可能出错；请核实重要内容。当前版本不包含实时 Web 搜索。</footer>
  </main>
}
