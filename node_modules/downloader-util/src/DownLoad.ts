const fs = require('fs-extra');
const path = require('path');
import axios from 'axios';
import DownloadMoreThread from './DownloadMoreThread';
import { getFileContent, saveJson } from './utils/fileutil';

export interface HttpHeaders {
  Referer?: string;
  Cookies?: string;
  'User-Agent'?: string;
  [key: string]: string | undefined;
}

export interface DownloadOptions {
  url: string;
  filePath: string;
  retry?: number;
  timeout?: number;
  type?: number;
  threadCount?: number;
  headers?: HttpHeaders;
  onProgress?: (progress: number) => void;
  onSuccess?: () => void;
  onFailed?: (error: string) => void;
}

interface DownloadConfig {
  start: number;
}

enum DownloadState {
  start = 0,
  stop,
}

export class DownLoad {
  private headers: HttpHeaders;
  private retry: number = 3;
  private url: string;
  private filePath: string;
  private timeout: number;
  private type: number; //0根据文件大小确定多线程or单线程 1单线程 2多线程
  private downloadState: DownloadState;
  private length: number; //文件大小
  private threadCount: number;
  private onFailed: (error: string) => void = (error: string) => {
    console.log(error);
  };
  private onProgress: ((progress: number) => void) | undefined;
  private onSuccess: (() => void) | undefined;
  private downloadMoreThread: DownloadMoreThread | undefined;
  public constructor(opts: DownloadOptions) {
    const {
      url,
      filePath,
      retry,
      type = 0,
      timeout = 5000,
      threadCount = 10,
      headers = {},
      onProgress,
      onSuccess,
      onFailed,
    } = opts;
    this.url = url;
    this.filePath = filePath;
    this.retry = retry || this.retry;
    this.timeout = timeout;
    this.type = type;
    this.length = 0;
    this.threadCount = threadCount;
    this.headers = headers;
    this.onFailed = onFailed || this.onFailed;
    this.onProgress = onProgress;
    this.onSuccess = onSuccess;
    this.downloadState = DownloadState.stop;
  }

  public async start() {
    this.downloadState = DownloadState.start;
    try {
      const response = await axios({
        url: this.url,
        method: 'GET',
        responseType: 'stream',
        timeout: this.timeout, // responsType是stream 连接5s未响应就算超时
        headers: this.headers,
      });
      const inputStream = response.data;
      if (this.downloadState !== DownloadState.start) {
        inputStream.destroy();
        return '';
      }

      const length = (this.length = response.headers['content-length'] || 1);
      console.log(`${this.url} 文件长度:${this.getFileSize(length)}`);
      inputStream.destroy();
      if (this.type === 0) {
        if (length < 1024 * 1024 * 10) {
          //文件小于10M 单线程下载
          console.log('文件小于10M 直接单线程下载');
          this.type = 1;
        } else {
          console.log('文件大于10M 启用多线程下载');
          this.type = 2;
        }
      }
      if (this.type === 1) {
        //文件小于10M 单线程下载
        console.log('开始单线程下载');
        await this.downloadOneThread();
      } else {
        // 大于10M 多线程下载
        // inputStream.destroy();//先关闭当前流 开启多线程下载
        console.log('开始多线程下载');
        const downloadMoreThread = (this.downloadMoreThread =
          new DownloadMoreThread({
            downloadUrl: this.url,
            desFile: this.filePath,
            threadCount: this.threadCount,
            length,
            onProgress: this.onProgress,
          }));
        await downloadMoreThread.start();
      }
    } catch (e) {
      setTimeout(() => {
        this.onFailed(e.toString());
      });
      return;
    }
    setTimeout(() => {
      this.removeConfig(this.filePath);
      this.onSuccess && this.onSuccess();
    });
  }

  private async downloadOneThread() {
    this.mkFile(this.filePath);
    const config = this.getDownloadConfig(this.filePath);
    let headers = Object.assign({}, this.headers);
    if (config.start == this.length) {
      console.log('下载已完成!直接返回');
      return '';
    }
    if (config.start != 0 && this.length !== 0) {
      headers.Range = `bytes=${config.start}-${this.length}`;
    }
    const response = await axios({
      url: this.url,
      method: 'GET',
      responseType: 'stream',
      timeout: this.timeout,
      headers,
    });
    const inputStream = response.data;
    if (this.downloadState !== DownloadState.start) {
      inputStream.destroy();
      return '';
    }

    // inputStream.pipe(writer);
    const length = response.headers['content-length'] || 1;
    let hasDownloadLength = config.start;

    const doProgress = (newLength: number) => {
      hasDownloadLength += newLength;
      const progress = hasDownloadLength / (+length + config.start);
      this.onProgress && this.onProgress(progress);
    };

    const onError = async (resolve: any, reject: any) => {
      inputStream.destroy();
      if (this.retry > 0) {
        this.retry--;
        fs.removeSync(this.filePath);
        try {
          await this.downloadOneThread();
          resolve('');
        } catch (e) {
          reject(e);
        }
      } else {
        reject(`下载失败,重试${this.retry}次`);
      }
    };

    return new Promise((resolve, reject) => {
      const fd = fs.openSync(this.filePath, 'a');
      let pos = config.start;
      let timeoutHandle: any = setTimeout(() => {
        console.log('超过10s没有新的数据产生，下载超时');
        onError(resolve, reject);
      }, this.timeout);
      inputStream.on('data', (chunk: any) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        if (this.downloadState !== DownloadState.start) {
          inputStream.destroy();
          reject('用户手动停止，停止下载');
          return;
        }
        timeoutHandle = setTimeout(() => {
          console.log('超过10s没有新的数据产生，下载超时');
          onError(resolve, reject);
        }, this.timeout);
        fs.writeSync(fd, chunk, 0, chunk.length, pos);
        pos += chunk.length;
        this.saveConfig(this.filePath, pos);
        doProgress(chunk.length);
      });
      inputStream.on('end', (data: any) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        fs.closeSync(fd);
        resolve('');
      });
      inputStream.on('error', (e: any) => {
        fs.closeSync(fd);
        onError(resolve, reject);
      });
    });
  }

  stop() {
    this.downloadState = DownloadState.stop;
    if (this.downloadMoreThread) {
      this.downloadMoreThread.stop();
    }
  }

  private getFileSize(length: number): string {
    const ksize = length / 1024;
    if (ksize < 1024) {
      return ksize.toFixed(2) + 'k';
    }
    const msize = ksize / 1024;
    if (msize < 1024) {
      return msize.toFixed(2) + 'M';
    }
    const gsize = msize / 1024;
    return gsize.toFixed(2) + 'G';
  }

  private mkFile(filePath: string) {
    const pathDes = path.resolve(filePath, '../');
    fs.ensureDirSync(pathDes);
  }

  private getDownloadConfig(filePath: string): DownloadConfig {
    const configPath = `${filePath}.config`;
    const content = getFileContent(configPath);
    if (content) {
      return JSON.parse(content);
    }
    return {
      start: 0,
    };
  }

  private saveConfig(filePath: string, pos: number) {
    const configPath = `${filePath}.config`;
    saveJson(configPath, { start: pos });
  }
  private removeConfig(filePath: string) {
    const configPath = `${filePath}.config`;
    fs.removeSync(configPath);
  }

  private downloadThreads() {}
}
