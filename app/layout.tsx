import './globals.css';
export const metadata = { title: '智能拆词助手', description: '上下文驱动的中文分词、词性标注与实体识别' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>}
