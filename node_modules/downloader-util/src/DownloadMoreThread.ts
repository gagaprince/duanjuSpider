import { TaskPool, Task } from './task/taskUtil';
import { DownloadThreadTask } from './DownloadThreadTask';
import { getFileContent, saveJson } from './utils/fileutil';
import { HttpHeaders } from './DownLoad';

const fse = require('fs-extra');

export interface DownloadThreadOption {
  downloadUrl: string;
  desFile: string;
  threadCount: number;
  length: number;
  headers?: HttpHeaders;
  onProgress?: (progress: number) => void;
}

interface DownloadConfig {
  hasDownloads: string[];
}

export default class DownloadMoreThread {
  private downloadUrl: string; //目标地址
  private pool: TaskPool | null;
  private desFile: string; //目标地址
  private length: number; // 要下载的文件长度
  private step: number = 1024 * 512; //每个分片 0.5M
  private downloadConfig: DownloadConfig;
  private headers: HttpHeaders;

  public constructor(opts: DownloadThreadOption) {
    const {
      downloadUrl,
      desFile,
      threadCount,
      length,
      headers = {},
      onProgress,
    } = opts;
    this.downloadUrl = downloadUrl;
    this.desFile = desFile;
    this.length = length;
    let config = (this.downloadConfig = this.getDownloadConfig(this.desFile));
    this.pool = new TaskPool(threadCount, config.hasDownloads.length);
    this.headers = headers;
    this.pool.onProgress((progress: number, task: DownloadThreadTask) => {
      config.hasDownloads.push(task.getKey());
      this.saveConfig(this.desFile, config);
      if (onProgress) {
        onProgress(progress);
      }
    });
  }
  public async start() {
    await this.initTask();
  }

  stop() {
    this.pool?.stop();
  }

  private async initTask() {
    // 创建一个文件
    this.createFile();
    // 开始下载任务
    try {
      await this.beginTask();
      this.finish();
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  private createFile() {
    // fse.removeSync(this.desFile);
    fse.ensureFileSync(this.desFile);
  }

  private async beginTask() {
    let degree = 0;
    let keyset = new Set<string>();
    this.downloadConfig.hasDownloads.forEach((split: string) => {
      keyset.add(split);
    });
    while (degree < this.length) {
      let start = degree;
      let end = degree + this.step;
      if (end >= this.length) {
        end = this.length;
      }
      if (!keyset.has(`${start}-${end}`)) {
        this.pool?.addTask(
          new DownloadThreadTask(this.downloadUrl, start, end, this.desFile)
        );
      }
      degree = end;
    }
    return new Promise((res, rej) => {
      if (this.pool?.isEmpty()) {
        res('');
        return;
      }
      this.pool?.addFinishListener((tasks: Task[]) => {
        const isFailed = tasks.some((task) => {
          return !task.taskIsSuccess;
        });
        isFailed ? rej('部分分片下载失败，请查看网络情况！') : res('');
      });
    });
  }

  private getDownloadConfig(filePath: string): DownloadConfig {
    const configPath = `${filePath}.more.config`;
    const content = getFileContent(configPath);
    if (content) {
      return JSON.parse(content);
    }
    return {
      hasDownloads: [],
    };
  }

  private saveConfig(filePath: string, config: DownloadConfig) {
    const configPath = `${filePath}.more.config`;
    saveJson(configPath, config);
  }
  private removeConfig(filePath: string) {
    const configPath = `${filePath}.more.config`;
    fse.removeSync(configPath);
  }

  private finish() {
    this.pool = null;
    this.removeConfig(this.desFile);
  }
}
