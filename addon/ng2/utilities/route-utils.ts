import * as ts from 'typescript';
import * as fs from 'fs';
import {findNodes, insertAfterLastOccurence} from './ast-utils';

/**
 * Adds provideRouter configuration to the main file (import and bootstrap) if 
 * main file hasn't been already configured, else it has no effect.
 * 
 * @param (mainFile) path to main.ts in ng project
 * @param (routesName) exported name for the routes array from routesFile
 * @param (routesFile)
 */
export function configureMain(mainFile: string, routesName: string, routesFile: string): Promise<void>{
  return insertImport(mainFile, 'provideRouter', '@angular/router')
  .then(() => {
    return insertImport(mainFile, routesName, routesFile, true);
  }).then(() => {
     let rootNode = ts.createSourceFile(mainFile, fs.readFileSync(mainFile).toString(),
                                              ts.ScriptTarget.ES6, true);
     // get ExpressionStatements from the top level syntaxList of the sourceFile
     let bootstrapNodes = rootNode.getChildAt(0).getChildren().filter(node => {
       // get bootstrap expressions
       return node.kind === ts.SyntaxKind.ExpressionStatement &&
              node.getChildAt(0).getChildAt(0).text.toLowerCase() === 'bootstrap';
      });
      // printAll(bootstrapNodes[0].getChildAt(0).getChildAt(2).getChildAt(2));
      if (bootstrapNodes.length !== 1) {
        return Promise.reject(new Error(`Did not bootstrap provideRouter in ${mainFile} because of multiple or no bootstrap calls`));
      }
      let bootstrapNode = bootstrapNodes[0].getChildAt(0);
      let isBootstraped = findNodes(bootstrapNode, ts.SyntaxKind.Identifier).map(_ => _.text).indexOf('provideRouter') !== -1;

      if (isBootstraped) {
        return Promise.resolve();
      }
      // if bracket exitst already, add configuration template, 
      // otherwise, insert into bootstrap parens
      var fallBackPos: number, configurePathsTemplate: string, separator: string, syntaxListNodes: any;
      let bootstrapProviders = bootstrapNode.getChildAt(2).getChildAt(2); // array of providers

      if ( bootstrapProviders ) {
        syntaxListNodes = bootstrapProviders.getChildAt(1).getChildren();
        fallBackPos = bootstrapProviders.getChildAt(2).pos; // closeBracketLiteral
        separator = syntaxListNodes.length === 0 ? '' : ', ';
        configurePathsTemplate = `provideRouter(${routesName})`;
      } else {
        fallBackPos = bootstrapNode.getChildAt(3).pos; // closeParenLiteral
        syntaxListNodes = bootstrapNode.getChildAt(2).getChildren();
        configurePathsTemplate = `, [provideRouter(${routesName})]`;
        separator = '';
      }

      return insertAfterLastOccurence(syntaxListNodes, separator, configurePathsTemplate,
                                       mainFile, fallBackPos);
   });
}

/**
 * Inserts a path to the new route into src/routes.ts if it doesn't exist
 * @param routesFile
 * @param pathOptions
 * @return Promise
 * @throws Error if routesFile has multiple export default or none.
 */
export function addPathToRoutes(routesFile: string, pathOptions: {[key: string]: any}): Promise<void>{
  let importPath = pathOptions.dir.replace(pathOptions.appRoot, '') + `/+${pathOptions.dasherizedName}`;
  let path: string = pathOptions.path || importPath.replace(/\+/g, '');
  let isDefault = pathOptions.isDefault ? ', terminal: true' : '';
  let content = `  { path: '${path}', component: ${pathOptions.component}${isDefault} }`;

  let rootNode = ts.createSourceFile(routesFile, fs.readFileSync(routesFile).toString(),
                                                         ts.ScriptTarget.ES6, true);
  let routesNode = rootNode.getChildAt(0).getChildren().filter(n => {
    // get export statement
    return n.kind === ts.SyntaxKind.ExportAssignment && 
          n.getFullText().indexOf('export default') !== -1;
  });
  if (routesNode.length !== 1){
    return Promise.reject(new Error('Did not insert path in routes.ts because' +
                          `there were multiple or no 'export default' statements`));
  }
  let routesArray = routesNode[0].getChildAt(2).getChildAt(1).getChildren(); // all routes in export route array
  let routeExists = routesArray.map(r => r.getFullText()).indexOf(`\n${content}`) !== -1;
  if (routeExists){
    // add import in case it hasn't been added already
    return insertImport(routesFile, pathOptions.component, `./app${importPath}`);
  }
  let fallBack = routesNode[0].getChildAt(2).getChildAt(2).pos; // closeBracketLiteral
  let separator = routesArray.length > 0 ? ',\n' : '\n';
  content = routesArray.length === 0 ? content + '\n' : content; // expand array before inserting path 
  return insertAfterLastOccurence(routesArray, separator, content, routesFile, fallBack).then(() => {
    return insertImport(routesFile, pathOptions.component, `./app${importPath}`);
  });
}

/**
* Add Import `import { symbolName } from fileName` if the import doesn't exit
* already. Assumes fileToEdit can be resolved and accessed.
* @param fileToEdit (file we want to add import to)
* @param symbolName (item to import)
* @param fileName (path to the file)
* @param isDefault (if true, import follows style for importing default exports)
*/

export function insertImport(fileToEdit: string, symbolName: string,
                                  fileName: string, isDefault=false): Promise<void> {
  let rootNode = ts.createSourceFile(fileToEdit, fs.readFileSync(fileToEdit).toString(),
                                                ts.ScriptTarget.ES6, true);
  let allImports = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);

  // get nodes that map to import statements from the file fileName
  let relevantImports = allImports.filter(node => {
    // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
    let importFiles = node.getChildren().filter(child => child.kind === ts.SyntaxKind.StringLiteral)
                      .map(n => (<ts.StringLiteralTypeNode>n).text);
    return importFiles.filter(file => file === fileName).length === 1;
  });

  if (relevantImports.length > 0) {

    var importsAsterisk: boolean = false;
    // imports from import file
    let imports: ts.Node[] = [];
    relevantImports.forEach(n => {
      Array.prototype.push.apply(imports, findNodes(n, ts.SyntaxKind.Identifier));
      if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
        importsAsterisk = true;
      }
    });

    // if imports * from fileName, don't add symbolName
    if (importsAsterisk) {
      return Promise.resolve();
    }

    let importTextNodes = imports.filter(n => (<ts.Identifier>n).text === symbolName);

    // insert import if it's not there
    if (importTextNodes.length === 0) {
      let fallbackPos = findNodes(relevantImports[0], ts.SyntaxKind.CloseBraceToken)[0].pos ||
                        findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].pos;
      return insertAfterLastOccurence(imports, ', ', symbolName, fileToEdit, fallbackPos);
    }
    return Promise.resolve();
  }

  // no such import declaration exists
  let useStrict = findNodes(rootNode, ts.SyntaxKind.StringLiteral).filter(n => n.text === 'use strict');
  let fallbackPos: number = 0;
  if(useStrict.length > 0){
    fallbackPos = useStrict[0].end;
  }
  let open = isDefault ? '' : '{ ';
  let close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  let insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
  let separator = insertAtBeginning ? '' : ';\n';
  return insertAfterLastOccurence(allImports, separator, `import ${open}${symbolName}${close}` + 
                                 ` from '${fileName}'${insertAtBeginning ? ';\n':''}`,
                                 fileToEdit, fallbackPos, ts.SyntaxKind.StringLiteral);
};

