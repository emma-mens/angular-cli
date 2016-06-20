import * as mockFs from 'mock-fs';
import { expect } from 'chai';
import * as ts from 'typescript';
import * as fs from 'fs';
import { InsertChange, RemoveChange } from '../../addon/ng2/utilities/change';
import {findNodes,
        sortNodesByPosition,
        insertAfterLastOccurence} from '../../addon/ng2/utilities/ast-utils';
import * as Promise from 'ember-cli/lib/ext/promise';
const readFile = Promise.denodeify(fs.readFile);

describe('ast-utils: findNodes', () => {
  const sourceFile = 'tmp/tmp.ts';

  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'tmp.ts': `import * as myTest from 'tests' \n` +
                  'hello.'
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('finds no imports', () => {
    let editedFile = new RemoveChange(sourceFile, 0, `import * as myTest from 'tests' \n`);
    return editedFile
    .apply()
    .then(() => {
      let rootNode = getRootNode(sourceFile);
      let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
      expect(nodes).to.be.empty;
    });
  });
  it('finds one import', () => {
    let rootNode = getRootNode(sourceFile);
    let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
    expect(nodes.length).to.equal(1);
  });
  it('finds two imports from inline declarations', () => {
    // remove new line and add an inline import
    let editedFile = new RemoveChange(sourceFile, 32, '\n');
    return editedFile
    .apply()
    .then(() => {
      let insert = new InsertChange(sourceFile, 32, `import {Routes} from '@angular/routes'`);
      return insert.apply();
    })
    .then(() => {
      let rootNode = getRootNode(sourceFile);
      let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
      expect(nodes.length).to.equal(2);
    });
  });
  it('finds two imports from new line separated declarations', () => {
    let editedFile = new InsertChange(sourceFile, 33, `import {Routes} from '@angular/routes'`);
    return editedFile
    .apply()
    .then(() => {
      let rootNode = getRootNode(sourceFile);
      let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
      expect(nodes.length).to.equal(2);
    });
  });
});

describe('ast-utils: sortNodesByPosition', () => {
  const sourceFile = 'tmp/tmp.ts';
  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'tmp.ts': ''
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('gives an empty array', () => {
    let nodes = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
    let sortedNodes = sortNodesByPosition(nodes);
    expect(sortedNodes).to.be.empty;
  });

  it('returns unity array', () => {
    let editedFile = new InsertChange(sourceFile, 0, `import * as ts from 'ts'`);
    return editedFile
    .apply()
    .then(() => {
      let nodes = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      let sortedNodes = sortNodesByPosition(nodes);
      expect(sortedNodes.length).to.equal(1);
      expect(sortedNodes[0].pos).to.equal(0);
    });
  });
  it('returns a sorted array of three components', () => {
    let content = `import {Router} from '@angular/router'\n` +
                  `import * as fs from 'fs'` +
                  `import {  Component} from '@angular/core'\n`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      let nodes = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      //shuffle up nodes
      let shuffledNodes = [nodes[1], nodes[2], nodes[0]];
      expect(shuffledNodes[0].pos).to.equal(38);
      expect(shuffledNodes[1].pos).to.equal(63);
      expect(shuffledNodes[2].pos).to.equal(0);

      let sortedNodes = sortNodesByPosition(shuffledNodes);
      expect(sortedNodes.length).to.equal(3);
      expect(sortedNodes[0].pos).to.equal(0);
      expect(sortedNodes[1].pos).to.equal(38);
      expect(sortedNodes[2].pos).to.equal(63);
    });
  });
});

describe('ast-utils: insertAfterLastOccurence', () => {
  const sourceFile = 'tmp/tmp.ts';
  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'tmp.ts': ''
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('inserts at beginning of file', () => {
    let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
    return insertAfterLastOccurence(imports,
                '\n', `import { Router } from '@angular/router';`, sourceFile, 0)
    .then(() => {
      return readFile(sourceFile, 'utf8');
    }).then((content) => {
      let expected = '\nimport { Router } from \'@angular/router\';';
      expect(content).to.equal(expected);
    });
  });
  it('throws an error if first occurence with no fallback position', () => {
    let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
    let err = 'tried to insert import { Router } from \'@angular/router\'; as ' +
              'first occurence with no fallback position';
    return insertAfterLastOccurence(imports,
                                    '\n', `import { Router } from '@angular/router';`, sourceFile)
    .catch(e =>
      expect(e.message).to.equal(err)
    );
  });
  it('inserts after last import', () => {
    let content = `import { foo, bar } from 'fizz';`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      return insertAfterLastOccurence(imports, ', ', 'baz', sourceFile,
                                      undefined, ts.SyntaxKind.Identifier);
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(content => expect(content).to.equal(`import { foo, bar, baz } from 'fizz';`))
  });
  it('inserts after last import declaration', () => {
    let content = `import * from 'foo' \n import { bar } from 'baz'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      return insertAfterLastOccurence(imports, '\n', `import Router from '@angular/router'`,
                                      sourceFile);
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(content => {
      let expected = `import * from 'foo' \n import { bar } from 'baz'` +
                     `\nimport Router from '@angular/router'`;
      expect(content).to.equal(expected);
    });
  });
  it('inserts correctly afer no imports', () => {
    let content = `import {} from 'foo'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
   .then(() => {
     let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
     return insertAfterLastOccurence(imports, ', ', 'bar', sourceFile, undefined,
                                     ts.SyntaxKind.Identifier);
   }).catch(() => {
     return readFile(sourceFile, 'utf8');
   })
    .then(newContent => {
      expect(newContent).to.equal(content);
      // use a fallback position for safety
      let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      let pos = findNodes(sortNodesByPosition(imports).pop(),
                          ts.SyntaxKind.CloseBraceToken).pop().pos;
      return insertAfterLastOccurence(imports, ' ', 'bar ',
                                      sourceFile, pos, ts.SyntaxKind.Identifier);
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(`import { bar } from 'foo'`);
    });
  });
});

  /**
 * Gets node of kind kind from sourceFile
 */
function getNodesOfKind(kind: ts.SyntaxKind, sourceFile: string) {
  return findNodes(getRootNode(sourceFile), kind);
}

function getRootNode(sourceFile: string) {
  return ts.createSourceFile(sourceFile, fs.readFileSync(sourceFile).toString(),
                                         ts.ScriptTarget.ES6, true);
}
