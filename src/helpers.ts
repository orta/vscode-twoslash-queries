import * as vscode from "vscode";
import type { QuickInfoResponse } from "typescript/lib/protocol";

export type Model = vscode.TextDocument;

/** Leverages the `tsserver` protocol to try to get the type info at the given `position`. */
export async function quickInfoRequest(model: Model, position: vscode.Position) {
  const { scheme, fsPath, authority, path } = model.uri;
  return await vscode.commands.executeCommand(
    "typescript.tsserverRequest",
    "quickinfo",
    {
      file: scheme === 'file' ? fsPath : `^/${scheme}/${authority || 'ts-nul-authority'}/${path.replace(/^\//, '')}`,
      line: position.line + 1,
      offset: position.character,
    }
  ) as any as QuickInfoResponse | undefined;
}

type InlayHintInfo = {
  hint: QuickInfoResponse | undefined;
  position: vscode.Position;
  lineLength?: number;
};

/** Creates a `vscode.InlayHint` to display a `QuickInfo` response. */
export function createInlayHint({ hint, position, lineLength = 0 }: InlayHintInfo): vscode.InlayHint | undefined {
  if (!hint || !hint.body) {
    return;
  }
  
  // Make a one-liner
  let text = hint.body.displayString
    .replace(/\\n/g, " ")
    .replace(/\/n/g, " ")
    .replace(/  /g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  
  // Cut off hint if too long
  // If microsoft/vscode#174159 lands, can change to check that
  const availableSpace = 120 - lineLength;
  if (text.length > availableSpace) {
    text = text.slice(0, availableSpace - 1) + "...";
  }

  return {
    kind: vscode.InlayHintKind.Type,
    position: position.translate(0, 1),
    label: text,
    paddingLeft: true,
  };
}

const range = (num: number) => [...Array(num).keys()];

type LineInfo = {
  model: Model;
  position: vscode.Position;
  lineLength: number;
};

/** Gets the first `QuickInfo` response in a given line, if available. */
export async function getLeftMostHintOfLine({ model, position, lineLength }: LineInfo) {
  for (const i of range(lineLength)) {
    const hint = await quickInfoRequest(model, position.translate(0, i));
  
    if (!hint || !hint.body) {
      continue;
    }

    return hint;
  }
}
