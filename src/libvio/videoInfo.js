
import fs from 'fs'
import path from 'path';

/**
 * 数据格式
 * {
 *      videoId: 160161,
 *      videoName: '寄生',
 *      videoUrl: 'https://libvio.one/detail/160161.html',
 *      videoItem: [
 *          {
 *              videoName:'第01集'
 *              videoUrl:'https://libvio.one/play/160161-1-1.html',
 *              videoM3u8Url:'https://v.cdnlz12.com/20240218/11602_097c3d7b/index.m3u8',
 *          }
 *      ]
 * }
 */

const cwd = process.cwd();
const videoListPath = path.resolve(cwd,'src/libvio/info', 'videoList.json')
const videoDetailInfoRootPath = path.resolve(cwd,'src/libvio/info')

export const getVideoListData = ()=>{
    try {
        let data = fs.readFileSync(videoListPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(e);
        if (err.code === 'ENOENT') {
            return null;  // 如果文件不存在，返回 null
        } else {
            throw err;  // 如果发生其他错误，抛出错误
        }
    }
}
export const saveVideoListData = (videoList)=>{
    let json = JSON.stringify(videoList, null, 2);
    try {
        fs.writeFileSync(videoListPath, json, 'utf8');
    }catch(e){
        console.error(e);
    }
}



function mkdirSyncRecursive(directory) {
    try {
        fs.mkdirSync(directory, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}



export const getVideoInfo = (title)=>{
    const videoInfoPath = path.resolve(videoDetailInfoRootPath, title);
    const videoInfoFilePath = path.resolve(videoInfoPath, 'config.json');
    try {
        let data = fs.readFileSync(videoInfoFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        if (err.code === 'ENOENT') {
            return null;  // 如果文件不存在，返回 null
        } else {
            throw err;  // 如果发生其他错误，抛出错误
        }
    }
}
export const saveVideoInfo = (title, videoItemInfo)=>{
    const videoInfoPath = path.resolve(videoDetailInfoRootPath, title);
    const videoInfoFilePath = path.resolve(videoInfoPath, 'config.json');
    mkdirSyncRecursive(videoInfoPath);
    let json = JSON.stringify(videoItemInfo, null, 2);
    try {
        fs.writeFileSync(videoInfoFilePath, json, 'utf8');
    }catch(e){
        console.error(e);
    }
}