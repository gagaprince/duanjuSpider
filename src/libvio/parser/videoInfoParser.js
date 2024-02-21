import cheerio from 'cheerio'

/**
 * 返回video页的信息
 * 
 * 
 */
export default function ({root}){
    return {
        parse(content){
            const $ = cheerio.load(content);
            const title = $('h1.title').text();
            const detailContent = $('.detail-content').text();
            const coverImg = $('.pic').find('img').attr('data-original');
            const itemUl = $('.stui-content__playlist').find('li');

            const itemLinkInfo = [];
            itemUl.each((index, li)=>{
                const itemName = $(li).find('a').text();
                const itemLink = $(li).find('a').attr('href');
                itemLinkInfo.push({
                    title: itemName,
                    link: `${root}${itemLink}`
                })
            })

            return {
                title, detailContent, coverImg,
                splitsLinkInfos: itemLinkInfo,
            }

        }
    }
}