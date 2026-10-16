import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
const Input = z.object({ text: z.string().trim().min(1).max(3000), mode: z.enum(['fast', 'precise']).default('precise') });
const Token = z.object({
  word: z.string().min(1),
  pos: z.string().min(1),
  entityType: z.enum(['人名','地名','机构','品牌','产品','作品','事件','其他实体','非实体','待核验']),
  detail: z.string().default(''),
  reason: z.string().default(''),
  uncertain: z.boolean().default(false)
});
const Result = z.object({tokens:z.array(Token).min(1).max(3000), note:z.string().default('')});
const instructions = `你是高精度中文分词、词性标注及命名实体识别系统。请严格输出 JSON 对象，字段 tokens（数组）和 note（简短说明）。
每个 token 字段 word、pos、entityType、detail、reason、uncertain。
要求：
1. 对原文逐字完整切分，保留所有标点、空格及换行；所有 tokens 的 word 顺序拼接必须与原文完全一致。不要改写文本。
2. pos 给出中文词性（名词、动词、形容词、代词、数量词、助词、标点、空白等）。entityType 只能使用：人名、地名、机构、品牌、产品、作品、事件、其他实体、非实体、待核验。
3. 专有名词优先结合上下文识别；词库未命中和句首位置绝不是识别人名的依据。
4. 区分用户句子中的事实断言与词语实际属性：瑞丽在中缅边境，是中国云南省的城市，不是国家；在杂志语境下“瑞丽”可能为作品名称。
5. 有歧义时根据上下文判断；不能判断则 entityType 为待核验，uncertain 为 true，不编造事实。
6. reason 简洁描述判定依据，detail 是实体细分类型，如“城市”“企业”等。普通词语的 reason 可为空。
7. 不要把整句话当成一个 token，要按自然词语边界细分。`;

export async function POST(request: NextRequest) {
  try {
    const parsed = Input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({error:'请输入 1～3000 个字符的文本。'}, {status:400});
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({error:'服务端尚未配置 OPENAI_API_KEY，请先在部署平台设置密钥。'}, {status:503});
    const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 45000);
    let upstream: Response;
    try {
      upstream = await fetch(base+'/chat/completions',{
        method:'POST',
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature:0,
          response_format:{type:'json_object'},
          messages:[
            {role:'system',content:instructions},
            {role:'user',content:(parsed.data.mode==='precise'?'请仔细消歧并给出具体依据。\n':'请简洁准确识别。\n')+parsed.data.text}
          ]
        }),
        signal:controller.signal,
        cache:'no-store'
      });
    } finally {clearTimeout(timeout);}
    if(!upstream.ok) {
      console.error('AI upstream status:', upstream.status);
      return NextResponse.json({error:'AI 服务请求失败，请检查密钥、模型及服务端日志。'}, {status:502});
    }
    const payload=await upstream.json();
    const raw=payload?.choices?.[0]?.message?.content;
    if(typeof raw!=='string') throw new Error('Empty response');
    const result=Result.parse(JSON.parse(raw));
    if(result.tokens.map(t=>t.word).join('')!==parsed.data.text)
      return NextResponse.json({error:'AI 返回的分词未完整覆盖原文，请重试。'}, {status:502});
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  } catch(err) {
    console.error('Analysis failed:',err);
    return NextResponse.json({error:'分析失败或响应超时，请稍后重试。'}, {status:500});
  }
}
