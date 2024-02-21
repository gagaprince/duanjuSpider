process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
import { download, DownLoad } from './src/index';
const path = require('path');

const mypath = path.resolve(__dirname, 'tmp/a.m3u8');
console.log(mypath);

const url =
  'https://vz-8bd03a41-60e.b-cdn.net/b8010124-bc2c-4e46-96c7-a3880c8f4026/1280x720/video.m3u8';

const task = new DownLoad({
  url,
  filePath: mypath,
  threadCount: 20,
  type: 1,
  headers: {
    referer: 'https://missav.com/',
    host: 'vz-8bd03a41-60e.b-cdn.net',
    accept: '*/*',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
  },
  onFailed: (error: string) => {
    console.log(`失败原因！！！:${error}`);
  },
  onSuccess: () => {
    console.log('文件下载成功！');
  },
  onProgress: (progress) => {
    console.log(`进度:${Math.floor(progress * 100)}%`);
  },
});
task.start();

// const fs = require('fs-extra');

// const fd = fs.openSync('./tmp/a.mp4', 'a');

// var buffer = new Buffer('加这么一段文字！！！！！');
// console.log(buffer.length);
// console.log(buffer)

// fs.writeSync(fd, buffer, 0, buffer.length, 100001);
