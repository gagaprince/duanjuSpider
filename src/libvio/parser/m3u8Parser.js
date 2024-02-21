import cheerio from 'cheerio'
import { parseM3u8Link } from '../js/jsexec.js'


export default {
    parse(content){
        const $ = cheerio.load(content);

        const scriptData = $($('.stui-player__video').find('script').get(0)).text();

        let match = scriptData.match(/=\s*(\{.+\})/);
        if (match) {
            let jsonStr = match[1];
            let playObj = JSON.parse(jsonStr);
            playObj = parseM3u8Link(playObj)
            return  playObj.url || '';
        }

        return '';
    }
}