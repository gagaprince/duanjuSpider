import cheerio from 'cheerio'

/**
 * 返回videoList页的信息
 * 
 * 
 */
export default function({root}){
    return {
        parse(content){
            const info = {}
            const list = [];
    
            const $ = cheerio.load(content);
            const vodlist = $('.stui-vodlist').find('li');
            vodlist.each((index, li)=>{
                const link = $(li).find('.stui-vodlist__thumb').attr('href');
                const title = $(li).find('.stui-vodlist__thumb').attr('title');
                list.push({
                    link: `${root}${link}`,
                    title,
                })
            })
    
            const pageList = $('.stui-page__item').find('li');
            const pageListLength = pageList.length;
            // const lastPageInfo = pageList.get(length-1);
            const nextPageInfo = pageList.get(pageListLength-2);
    
            // const lastLink = lastPageInfo.find('a').attr('href');
            const nextLink = $(nextPageInfo).find('a').attr('href');
    
            info.list = list;
            info.nextLink = nextLink;
    
            return info;
        }
    }
}