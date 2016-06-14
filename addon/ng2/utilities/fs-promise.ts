'use strict';

import * as fs from 'fs';

/**
 * Read a file and return a promise
 * @param path (path to file)
 * @return Promise with file content
 */
export function readWithPromise(path: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      };
      resolve(data);
    })
  })
};

/**
 * Write to file and return a promise
 * @param path (path to file)
 * @return an empty Promise
 */
export function writeWithPromise(path: string, content: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(path, content, (err: any) => {
      if (err) {
        reject(err);
        return;
      };
      resolve();
    })
  })
};