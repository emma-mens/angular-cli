'use strict';

let expect = require('chai').expect;
let path = require('path');
let change = require('../../addon/ng2/utilities/change');
let mockFs = require('mock-fs');
let fs = require('fs');
let fsPromise = require('../../addon/ng2/utilities/fs-promise');


describe('InsertChange: adding string to the source code', () => {
  let sourcePath = 'src/app/my-component';
  beforeEach(() => {
    let mockDrive = {
      'src/app/my-component': {
        'component-file.txt': 'hello'
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should add text to the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.InsertChange(sourceFile, 6, ' world!');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'hello world!';
        expect(contents).to.equal(expectedContents);
      })
  })

  it('should add text to the source code but with unexpected output', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.InsertChange(sourceFile, -6, ' world!');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'hello world!';
        expect(contents).to.not.equal(expectedContents);
      });
  })

  it('should not have any changes to the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.InsertChange(sourceFile, 6, '');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'hello';
        expect(contents).to.equal(expectedContents);
      });
  })


});

describe('RemoveChange: remove string from the source code', () => {
  let sourcePath = 'src/app/my-component';
  beforeEach(() => {
    let mockDrive = {
      'src/app/my-component': {
        'component-file.txt': 'import * as foo from "./bar"'
      }

    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should remove text from the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.RemoveChange(sourceFile, 9, 'as foo');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'import *  from "./bar"';
        expect(contents).to.equal(expectedContents);
      });
  })

  it('should remove text from the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.RemoveChange(sourceFile, 9, '');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'import * as foo from "./bar"';
        expect(contents).to.equal(expectedContents);
      });
  })

});

describe('ReplaceChange: replace string in the source code', () => {

  let sourcePath = 'src/app/my-component';
  beforeEach(() => {
    let mockDrive = {
      'src/app/my-component': {
        'component-file.txt': 'import * as foo from "./bar"'
      }

    };
    mockFs(mockDrive);
    sourcePath = path.join('src/app/my-component');
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should replace text in the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.ReplaceChange(sourceFile, 7, '* as foo', '{ fooComponent }');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'import { fooComponent } from "./bar"';
        expect(contents).to.equal(expectedContents);
      });
  })

  it('should replace text in the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.ReplaceChange(sourceFile, 7, '', '{ fooComponent }');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'import { fooComponent }* as foo from "./bar"';
        expect(contents).to.equal(expectedContents);
      });
  })

  it('should replace text in the source code', () => {
    let sourceFile = path.join(sourcePath, 'component-file.txt');
    expect(fs.existsSync(sourceFile)).to.equal(true);
    let changeInstance = new change.ReplaceChange(sourceFile, 7, '* as foo', '');
    return changeInstance
      .apply()
      .then(() => {
        return fsPromise.readWithPromise(sourceFile);
      }).then(contents => {
        let expectedContents = 'import  from "./bar"';
        expect(contents).to.equal(expectedContents);
      });
  })
});
