import * as vscode from "vscode";
import { getHintsFromQueries } from "./queries";
import { getPositionOfLeftMostHintOfLine } from "./helpers";

export function activate(context: vscode.ExtensionContext) {
  registerInlayHintsProvider(context);
  registerInsertTwoSlashQueryCommand(context);
}

export function deactivate() {}

function registerInlayHintsProvider(context: vscode.ExtensionContext) {
  const provider: vscode.InlayHintsProvider = {
    provideInlayHints: async (model, iRange, cancel) => {
      const offset = model.offsetAt(iRange.start);
      const text = model.getText(iRange);
      return await getHintsFromQueries({ text, offset, model, cancel });
    },
  };

  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(
      [{ language: "javascript" }, { language: "typescript" }, { language: "typescriptreact" }, { language: "javascriptreact" }],
      provider
    )
  );
}

function registerInsertTwoSlashQueryCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'orta.vscode-twoslash-queries.insert-twoslash-query',
      async (textEditor: vscode.TextEditor) => {
        const { document, selection: { active } } = textEditor;
        const eolRange = document.lineAt(active.line).range.end;
        const isLineEmpty = document.lineAt(active.line).isEmptyOrWhitespace;
        
        let comment: string;
        if (isLineEmpty) {
          const prevLine = document.lineAt(active.line - 1);
          const position = await getPositionOfLeftMostHintOfLine({
            model: document,
            position: prevLine.range.start,
            lineLength: prevLine.text.length,
          });
          comment = '//'.padEnd(position !== undefined ? position - 1 : active.character, ' ').concat('^?');
        } else {
          comment = '//'.padEnd(active.character, ' ').concat('^?');
        }

        textEditor.edit(editBuilder => {
          const eolChar = isLineEmpty ? '' : document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
          editBuilder.insert(eolRange, eolChar + comment);
        });
      }
    )
  );
}
