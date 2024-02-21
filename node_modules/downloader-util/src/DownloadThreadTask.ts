import { Task } from './task/taskUtil';
import axios from 'axios';
import { HttpHeaders } from './DownLoad';
const fs = require('fs');

enum TASK_DOWNLOAD_STATUS {
  START,
  STOP,
}

export class DownloadThreadTask extends Task {
  public retry = 10;
  private status: TASK_DOWNLOAD_STATUS;
  inputStream: any;

  public constructor(
    private downloadUrl: string,
    private start: number,
    private end: number,
    private desFile: string,
    private headers: HttpHeaders = {}
  ) {
    super();
    this.status = TASK_DOWNLOAD_STATUS.START;
  }

  getKey() {
    return `${this.start}-${this.end}`;
  }

  async task(): Promise<any> {
    try {
      const ret = await this.doTask();
      return ret;
    } catch (e) {
      if (e === '用户手动停止，停止下载') throw e;
      if (this.retry > 0) {
        this.retry--;
        return await this.task();
      }
      throw e;
    }
  }

  private async doTask() {
    if (this.status !== TASK_DOWNLOAD_STATUS.START) return;
    const response = await axios({
      url: this.downloadUrl,
      method: 'GET',
      responseType: 'stream',
      headers: Object.assign(
        { Range: `bytes=${this.start}-${this.end}` },
        this.headers
      ),
    });
    const inputStream = (this.inputStream = response.data);
    const length = response.headers['content-length'] || 1;
    // console.log(`分片:${this.start}-${this.end}`);
    // console.log('长度:' + length);

    return new Promise((res, rej) => {
      const fd = fs.openSync(this.desFile, 'a');
      let pos = this.start;
      let timeoutHandle = setTimeout(() => {
        inputStream.destroy();
        rej('10s没有新数据读出，网络有问题终端');
      }, 10000);
      inputStream.on('data', (chunk: any) => {
        if (timeoutHandle != null) {
          clearTimeout(timeoutHandle);
        }
        if (this.status !== TASK_DOWNLOAD_STATUS.START) {
          inputStream.destroy();
          rej('用户手动停止，停止下载');
          return;
        }
        timeoutHandle = setTimeout(() => {
          inputStream.destroy();
          rej('10s没有新数据读出，网络有问题终端');
        }, 10000);
        // console.log(`当前属于分片:${this.start}-${this.end}`);
        fs.writeSync(fd, chunk, 0, chunk.length, pos);
        pos += chunk.length;
      });
      inputStream.on('end', () => {
        if (timeoutHandle != null) {
          clearTimeout(timeoutHandle);
        }
        res('');
      });
      inputStream.on('error', rej);
    });
  }
  stop() {
    this.status = TASK_DOWNLOAD_STATUS.STOP;
    this.inputStream?.destroy();
  }
}
