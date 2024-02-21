import fs from 'fs'
import path from 'path'
import { downloadM3u8FileToMp4 } from 'downloader-m3u8'
import { parseWebContent } from '../base/http.js';
import { saveVideoListData, getVideoListData, saveVideoInfo, getVideoInfo } from './videoInfo.js';
import videoInfoParser  from './parser/videoInfoParser.js';
import videoListParser from './parser/videoListParser.js';
import m3u8Parser from './parser/m3u8Parser.js';

let config;
const root = 'https://libvio.one';
const rootUrl = 'https://libvio.one/type/21.html';

async function parseVideoListInfo(force = false){
    // 获取网页内容
    console.log('获取网站信息：',rootUrl);
    // 获取影片信息列表并保存
    let videoList = getVideoListData();

    if(!videoList || force){
        let currentLink = rootUrl;
        for(let i=0; i<500; i++){ //防止死循环 最高500
            console.log(`搜索第${i+1}页内容，link: ${currentLink}`)
            const videoListInfo = await parseWebContent(currentLink, videoListParser({root}));
            videoList = videoList.concat(videoListInfo.list || []);
            const nextLink = `${root}${videoListInfo.nextLink}`
            if(currentLink === nextLink){
                break;
            }
            currentLink = nextLink;
            saveVideoListData(videoList)
        }
        saveVideoListData(videoList)
        // 获取影片信息列表并保存
    }else{
        console.log('读取了缓存');
    }
    console.log(videoList)
    return videoList;
}

async function parseVideoDetailInfo(videoTitle, videoLink, force = false){
    let videoDetailInfo = getVideoInfo(videoTitle);

    if(!videoDetailInfo || force){
        videoDetailInfo = await parseWebContent(videoLink, videoInfoParser({root}));
    }

    // 分析 splitsLinkInfos 的 m3u8地址
    const { splitsLinkInfos } = videoDetailInfo;
    const length = splitsLinkInfos.length;
    for(let i=0;i<length; i++){
        const splitsLinkInfo = splitsLinkInfos[i];
        const { title, link } = splitsLinkInfo;
        if(!splitsLinkInfo.m3u8Link){
            console.log(`获取 ${title} 的m3u8链接`);
            const m3u8Link = await parseWebContent(link, m3u8Parser);
            splitsLinkInfo.m3u8Link = m3u8Link;
            saveVideoInfo(videoTitle, videoDetailInfo);
        }
    }
    
    return videoDetailInfo;
}

async function downloadVideoDetail(videoTitle, splitsLinkInfo){
    const { title, m3u8Link, filePath } = splitsLinkInfo;
    if(filePath && fs.eexistsSync(filePath))return;
    const desFilePath = path.resolve(config.filePath, videoTitle);
    await downloadM3u8FileToMp4({
        m3u8Url:m3u8Link,    // m3u8url
        filePath:desFilePath,  //文件保存路径 会先清空目录，请选择干净的目录
        title, // 最终保存的文件名
        threadCount:10 // 开启几个线程并发下载
    })
    splitsLinkInfo.filePath = path.resolve(desFilePath, `${title}.mp4`);
}

async function downloadVideo(videoDetailInfo){
    const { title, splitsLinkInfos } = videoDetailInfo;
    const length = splitsLinkInfos.length;
    for(let i=0;i<length;i++){
        const splitsLinkInfo = splitsLinkInfos[i];
        try{
            console.log(`开始下载 ${title} ${splitsLinkInfo.title}`)
            await downloadVideoDetail(title, splitsLinkInfo);
            console.log(`${title} ${splitsLinkInfo.title} 下载完成`);
            saveVideoInfo(title, videoDetailInfo);
        }catch(e){
            console.error(e);
        }
    }
}

async function startDownloadWithNum(num=1){
    // 获取视频列表信息 
    const videoList = await parseVideoListInfo(false);

    let last =  num;
    let i = 0;
    while(last>0){
        const videoCurrent = videoList[i];
        if(!videoCurrent){
            console.log('所有影片已经下载完毕');
            break;
        }
        const { title, link, hasDownload } = videoCurrent;
        if(hasDownload){
            i++;
            continue
        }
        const videoDetailInfo = await parseVideoDetailInfo(title, link);
        console.log(videoDetailInfo);
        // 等待下载完毕
        try{
            await downloadVideo(videoDetailInfo);
            videoCurrent.hasDownload = true;
            saveVideoListData(videoList);
        }catch(e){
            console.error(e);
        }
        i++;
        last--;
    }
}

async function startDownloadWithVideoNames(videoNames){
    const videoList = await parseVideoListInfo(false);
    const desVideoList = videoNames.map(name => videoList.find(video => video.title === name)).filter(Boolean);

    for(let i=0;i<desVideoList.length;i++){
        try{
            const videoCurrent = desVideoList[i];
            const { title, link, hasDownload } = videoCurrent;
            if(hasDownload){
                continue
            }
            const videoDetailInfo = await parseVideoDetailInfo(title, link);
            console.log(videoDetailInfo);
            // 等待下载完毕
            try{
                await downloadVideo(videoDetailInfo);
                videoCurrent.hasDownload = true;
                saveVideoListData(videoList);
            }catch(e){
                console.error(e);
            }
        }catch(e){
            console.error(e);
        }
        
    }
    console.log('所有影片已经下载完毕');
}

export default {
    async startSpider(cfg){
        config = cfg
        console.log('任务开始')
        console.log(`最终视频保存在此目录：${cfg.filePath}`)
        // startDownloadWithNum();
        startDownloadWithVideoNames(['寄生','四爷，你家娇妻马甲又掉了'])
    }
}


// 测试一下下载
        // const url = 'https://v.cdnlz12.com/20240218/11602_097c3d7b/index.m3u8';
        // downloadM3u8FileToMp4({
        //     m3u8Url:url,    // m3u8url
        //     filePath:cfg.filePath,  //文件保存路径 会先清空目录，请选择干净的目录
        //     title:'test1', // 最终保存的文件名
        //     threadCount:10 // 开启几个线程并发下载
        // })