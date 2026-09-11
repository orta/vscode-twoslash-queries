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
        const { document, selections } = textEditor;
        const selectionsPerLine = new Map(selections.map(sel => [sel.active.line, sel])); // Keep only the last selection for each line
        const inserts: Array<{ eolRange: vscode.Position; comment: string }> = [];

        for (const { active } of selectionsPerLine.values()) {
          const currLine = document.lineAt(active.line);
        
          let padding = active.character;
          let eolRange = currLine.range.end;
          if (currLine.isEmptyOrWhitespace && active.line > 0) {
            const prevLine = document.lineAt(active.line - 1);
            const hint = await getLeftMostHintOfLine({
              model: document,
              position: prevLine.range.start,
              lineLength: prevLine.text.length + 1,
            });
            const position = hint?.start?.offset;
            if (position) {
              padding = position - 1;
              eolRange = prevLine.range.end;
            }
          }
          const comment = '//'.padStart(currLine.firstNonWhitespaceCharacterIndex + 2).padEnd(padding, ' ').concat('^?');

          inserts.push({ eolRange, comment });
        }

        textEditor.edit(editBuilder => {
          const eolChar = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
          for (const { eolRange, comment } of inserts) {
            editBuilder.insert(eolRange, eolChar + comment);
          }
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
        const { document, selections } = textEditor;
        const comment = ' // =>';
        const selectionsPerLine = new Map(selections.map(sel => [sel.active.line, sel])); // Keep only the last selection for each line
        const eolRangesForInserts: Array<vscode.Position> = [];

        for (const { end } of selectionsPerLine.values()) {
          eolRangesForInserts.push(document.lineAt(end.line).range.end);
        }

        textEditor.edit(editBuilder => {
          for (const eolRange of eolRangesForInserts) {
            editBuilder.insert(eolRange, comment);
          }
        });
      }
    )
  );
}
