import * as ts from 'typescript';
import { InsertChange } from './change';
/**
* Find all nodes from the AST in the subtree of node of SyntaxKind kind.
* @param node 
* @param kind (a valid index of ts.SyntaxKind enum, eg ts.SyntaxKind.ImportDeclaration)
* @return all nodes of kind kind, or [] if none is found
*/
export function findNodes (node: ts.Node, kind: number, arr: ts.Node[] = []): ts.Node[] {
  if (node) {
    if (node.kind === kind) {
      arr.push(node);
    }
    node.getChildren().forEach(child => findNodes(child, kind, arr));
  }
  return arr;
}

/**
 * @param nodes (nodes to sort)
 * @return (nodes sorted by their position from the source file 
 *          or [] if nodes is empty)
 */
export function sortNodesByPosition(nodes: ts.Node[]): ts.Node[]{
  if (nodes) {
    return nodes.sort((first, second) => {return first.pos - second.pos});
  }
  return [];
}

/**
 *
 * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
 * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
 * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
 * Example:
 *   1. [foo, bar, baz]
 *   2. import { foo, bar } from 'baz'
 * In case 1, provide nodes containing the array elements. No syntaxKind needed
 *   Function will insert `toInsert` after `baz`.
 * 
 * In case 2, to add another import from `baz`, provide array of import items 
 *   Function will add `toInsert` after `bar`. syntaxKind of import items is neede 
 * 
 * @param nodes (insert after the last occurence of nodes)
 * @param toInsert (string to insert)
 * @param separator (separator between existing text that comes before
 *                   the new text and toInsert)
 * @param file (file to write the changes to)
 * @param fallbackPos (position to insert if toInsert happens to be the first occurence)
 * @param syntaxKind (the ts.SyntaxKind of the subchildren to insert after) 
 * @throw Error if toInsert is first occurence but fall back is not set
 */
export function insertAfterLastOccurence(nodes: ts.Node[], separator: string, toInsert:string, file: string, 
                          fallbackPos?: number, syntaxKind?: ts.SyntaxKind): Promise<void> {
  var lastItem = sortNodesByPosition(nodes).pop();

  if (syntaxKind) {
    lastItem = sortNodesByPosition(findNodes(lastItem, syntaxKind)).pop();
  }
  if (!lastItem && fallbackPos == undefined) {
    return Promise.reject(new Error(`tried to insert ${toInsert} as first occurence with no fallback position`));
  }
  let lastItemPosition: number = lastItem ? lastItem.end : fallbackPos;
  let editFile = new InsertChange(file, lastItemPosition, separator + toInsert);
  return editFile.apply();
}