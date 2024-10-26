import * as vscode from "vscode";
import {
  type Model,
  quickInfoRequest,
  createInlayHint,
  getLeftMostHintOfLine
} from "./helpers";

/** Strongly-typed RegExp groups (https://github.com/microsoft/TypeScript/issues/32098#issuecomment-1279645368) */
type RegExpGroups<T extends string> = (
  & IterableIterator<RegExpMatchArray>
  & {
    groups: { [name in T]: string } | { [key: string]: string };
  }[]
);

const strictEndEnabled = vscode.workspace
  .getConfiguration("orta.vscode-twoslash-queries")
  .get<boolean>("enableStrictEnd", false);

const twoslashQueryRegex = new RegExp(/^\s*\/\/\.?\s*\^\?/.source + (strictEndEnabled ? "$" : ""), "gm"); // symbol: ^?
// https://regex101.com/r/6Jb8h2/1
const inlineQueryRegex = new RegExp(/^[^\S\r\n]*(?<start>\S).*\/\/\s*(?<end>=>)/.source + (strictEndEnabled ? "$" : ""), "gm"); // symbol: =>
type InlineQueryMatches = RegExpGroups<"start" | "end">;

type Query = {
  text: string;
  offset: number;
  model: Model;
  cancel: vscode.CancellationToken;
};

type InlayHintsPromise = Promise<vscode.InlayHint[]>;

/** Checks for and returns regular two-slash query hints (symbol: ^?). */
async function checkTwoslashQuery({ text, offset, model, cancel }: Query): InlayHintsPromise {
  const results: vscode.InlayHint[] = [];
  const m = text.matchAll(twoslashQueryRegex);

  for (const match of m) {
    if (match.index === undefined) {
      break;
    }

    const end = match.index + match[0].length - 1;
    // Add the start range for the inlay hint
    const endPos = model.positionAt(end + offset);

    if (cancel.isCancellationRequested) {
      return [];
    }

    const hint = await quickInfoRequest(model, endPos.translate(-1));
    const inlayHint = createInlayHint({ hint, position: endPos });
    
    if(inlayHint) {
      results.push(inlayHint);
    }
  }

  return results;
}

/** Checks for and returns inline query hints (symbol: =>). */
async function checkInlineQuery({ text, offset, model, cancel }: Query): InlayHintsPromise {
  const results: vscode.InlayHint[] = [];
  const m = text.matchAll(inlineQueryRegex) as InlineQueryMatches;

  for (const match of m) {
    if (match.index === undefined) {
      break;
    }

    if (cancel.isCancellationRequested) {
      return [];
    }

    const [line] = match;
    const { start, end: querySymbol } = match.groups;
    const startIndex = line.indexOf(start);
    const startPos = model.positionAt(startIndex + offset + match.index);
    const endIndex = line.lastIndexOf(querySymbol) + 2;
    const endPos = model.positionAt(endIndex + offset + match.index);

    const hint = await getLeftMostHintOfLine({ model, position: startPos, lineLength: endIndex - startIndex - 2 });
    const inlayHint = createInlayHint({ hint, position: endPos, lineLength: line.length });
    
    if(inlayHint) {
      results.push(inlayHint);
    }
  }

  return results;
}

/** Sequentially checks each type of query for hints to display. */
export async function getHintsFromQueries(queryInfo: Query): InlayHintsPromise {
  const queries = [checkTwoslashQuery, checkInlineQuery];
  const results: vscode.InlayHint[] = [];

  for (const query of queries) {
    const queryResults = await query(queryInfo);
    results.push(...queryResults);
  }

  return results;
}
