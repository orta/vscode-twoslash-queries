import * as vscode from "vscode";
import { getHintsFromQueries } from "./queries";

export function activate(context: vscode.ExtensionContext) {
  registerInlayHintsProvider(context);
  registerInsertTwoSlashQueryCommand(context);
  registerInsertInlineQueryCommand(context);
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
      [{ language: "javascript" }, { language: "typescript" }, { language: "typescriptreact" }, { language: "javascriptreact" }, {language: "vue"}],
      provider
    )
  );
}

function registerInsertTwoSlashQueryCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'orta.vscode-twoslash-queries.insert-twoslash-query',
      (textEditor: vscode.TextEditor) => {
        const { document, selection: { end, active } } = textEditor;
        const eolRange = document.lineAt(end.line).range.end;
        const comment = '//'.padEnd(active.character, ' ').concat('^?');

        textEditor.edit(editBuilder => {
          const eolChar = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
          editBuilder.insert(eolRange, eolChar + comment);
        });
      })
  );
}

function registerInsertInlineQueryCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'orta.vscode-twoslash-queries.insert-inline-query',
      (textEditor: vscode.TextEditor) => {
        const { document, selection: { end } } = textEditor;
        const eolRange = document.lineAt(end.line).range.end;
        const comment = ' // =>';

        textEditor.edit(editBuilder => editBuilder.insert(eolRange, comment));
      }
    )
  );
}
