import path from 'path'
import libVioSpider from './libvio/index.js';

const cwd = process.cwd();

export const spiderLibVio = ()=>{
    libVioSpider.startSpider({
        filePath:path.resolve(cwd,'temp')
    });
}