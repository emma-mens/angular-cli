'use strict';

import { readWithPromise, writeWithPromise } from './fs-promise';

export interface Change {
  /**
   *  True on success, false otherwise.
   */
  apply(): Promise<void>;

  // The file this change should be applied to. Some changes might not apply to
  // a file (maybe the config).
  path: string | null;

  // The order this change should be applied. Normally the position inside the file.
  // Changes are applied from the bottom of a file to the top.
  order: number | null;

  // The description of this change. This will be outputted in a dry or verbose run.
  description: string;
}

/**
 * Will add text to the source code.
 */
export class InsertChange implements Change {

  constructor(
      public path: string,
      private pos: number,
      private toAdd: string,
      public order?: number,
      public description?: string) {
    this.description = description ? description :
      `Inserted ${toAdd} into position ${pos} of ${path}`;
    this.order = order ? order : 1; // don't know what this does yet
  }

  /**
   * This method does not insert spaces if there is none in the original string. 
   * @param file (path to file)
   * @param pos
   * @param toAdd (text to add)
   * @return Promise with a description on success or reject on error
   */
  apply(): Promise<any> {
    return readWithPromise(this.path).then(content => {
      content = content.substring(0, this.pos) + this.toAdd + content.substring(this.pos);
      return writeWithPromise(this.path, content);
    });
  }
}

/**
 * Will remove text from the source code.
 */
export class RemoveChange implements Change {

  constructor(
      public path: string,
      private pos: number,
      private toRemove: string,
      public order?: number,
      public description?: string) {
    this.description = description ? description :
      `Removed ${toRemove} into position ${pos} of ${path}`;
    this.order = order ? order : 1; // don't know what this does yet
  }

  apply(): Promise<any> {
    return readWithPromise(this.path).then(content => {
      content = content.substring(0, this.pos) + content.substring(this.pos + this.toRemove.length);
      return writeWithPromise(this.path, content);
    });
  }
}

/**
 * Will replace text from the source code.
 */
export class ReplaceChange implements Change {

  constructor(
      public path: string,
      private pos: number,
      private oldText: string,
      private newText: string,
      public order?: number,
      public description?: string) {
    this.description = description ? description :
      `Replaced ${oldText} into position ${pos} of ${path} with ${newText}`;
    this.order = order ? order : 1; // don't know what this does yet
  }

  apply(): Promise<any> {
    return readWithPromise(this.path).then(content => {
      content = content.substring(0, this.pos) + this.newText + content.substring(this.pos + this.oldText.length);
      writeWithPromise(this.path, content);
    });
  }
}

/**
 * Will output a message for the user to fulfill.
 */
export class MessageChange implements Change {
  constructor(text: string) {
  }

  apply(): Promise<void> { return new Promise(); }
}
