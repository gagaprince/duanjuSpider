import https from 'https';

export const getWebContent = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

export const parseWebContent = async (url, parser)=>{
    try{
        const content = await getWebContent(url);
        return parser.parse(content);
    }catch(e){
        console.error(e);
    }
    return {};
}



