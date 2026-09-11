import * as vscode from "vscode";

export type Model = vscode.TextDocument;

export type QuickInfo = {
  displayString: string;
  start?: { offset: number };
};

/** Uses VS Code's language-agnostic hover API to get type info at the given `position`. */
export async function quickInfoRequest(model: Model, position: vscode.Position) {
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    model.uri,
    position
  );

  for (const hover of hovers || []) {
    const displayString = getHoverDisplayString(hover.contents);
    if (displayString) {
      return {
        displayString,
        start: getHoverStart(hover),
      } satisfies QuickInfo;
    }
  }
}

export function getHoverStart(hover: vscode.Hover): QuickInfo["start"] {
  return hover.range ? { offset: hover.range.start.character + 1 } : undefined;
}

export function getHoverDisplayString(contents: readonly (vscode.MarkdownString | vscode.MarkedString)[]): string | undefined {
  for (const content of contents) {
    if (typeof content !== "string" && "language" in content) {
      return content.value;
    }

    const markdown = typeof content === "string" ? content : content.value;
    const codeBlock = /```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/.exec(markdown);
    if (codeBlock) {
      return codeBlock[1];
    }
  }
}

type InlayHintInfo = {
  hint: QuickInfo | undefined;
  position: vscode.Position;
  lineLength?: number;
};

/** Creates a `vscode.InlayHint` to display a `QuickInfo` response. */
export function createInlayHint({ hint, position, lineLength = 0 }: InlayHintInfo): vscode.InlayHint | undefined {
  if (!hint) {
    return;
  }
  
  // Make a one-liner
  let text = hint.displayString
    .replace(/\r?\n\s*/g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  
  // Cut off hint if too long
  // If microsoft/vscode#174159 lands, can change to check that
  const availableSpace =
    vscode.workspace
      .getConfiguration("orta.vscode-twoslash-queries")
      .get<number>("maxLength", 120) - lineLength;
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
  
    if (!hint) {
      continue;
    }

    return hint;
  }
}
