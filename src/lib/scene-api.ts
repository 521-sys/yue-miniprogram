import Taro from '@tarojs/taro';
import {API_BASE as BASE} from './config';
import type {Dialogue} from '../data/dialogues';
async function read(path:string):Promise<any>{const r=await Taro.request({url:BASE+path,method:'GET'});if(r.statusCode!==200)throw new Error((r.data as any)?.error||'场景读取失败，请重试');return r.data}
function mapScene(s:any):Dialogue {
 return {id:'official:'+s.id,title:s.title,place:s.place,emoji:s.emoji||'💬',roles:[s.roleA,s.roleB],
 lines:(s.lines||[]).map((l:any)=>({speaker:l.speaker,yue:l.cantoneseText,man:l.mandarinText,jyutping:l.jyutping,
 audioUrl:l.audioKey?BASE+(l.audioKey.startsWith('upload:')?'/audio/uploads/'+l.audioKey.slice(7):'/audio/'+encodeURIComponent(l.audioKey)):undefined}))};
}
export async function listPublishedScenes():Promise<Dialogue[]>{const data=await read('/api/public/scenes');if(!Array.isArray(data))throw new Error('场景数据格式不正确');return data.map(mapScene)}
export async function getPublishedScene(id:number):Promise<Dialogue>{if(!Number.isSafeInteger(id)||id<1)throw new Error('场景不存在');return mapScene(await read('/api/public/scenes/'+id))}
