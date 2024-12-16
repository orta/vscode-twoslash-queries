import * as vscode from "vscode";
import { getHintsFromQueries } from "./queries";
import { getLeftMostHintOfLine } from "./helpers";

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
      async (textEditor: vscode.TextEditor) => {
        const { document, selection: { active } } = textEditor;
        const currLine = document.lineAt(active.line);
        
        let padding = active.character;
        let eolRange = currLine.range.end;
        if (currLine.isEmptyOrWhitespace) {
          const prevLine = document.lineAt(active.line - 1);
          const hint = await getLeftMostHintOfLine({
            model: document,
            position: prevLine.range.start,
            lineLength: prevLine.text.length + 1,
          });
          const position = hint?.body?.start.offset;
          if (position) {
            padding = position - 1;
            eolRange = prevLine.range.end;
          }
        }
        const comment = '//'.padStart(currLine.firstNonWhitespaceCharacterIndex + 2).padEnd(padding, ' ').concat('^?');

        textEditor.edit(editBuilder => {
          const eolChar = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
          editBuilder.insert(eolRange, eolChar + comment);
        });
      }
    )
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
