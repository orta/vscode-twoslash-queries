import * as vscode from "vscode";
import { getHintsFromQueries } from "./queries";

export function activate(context: vscode.ExtensionContext) {
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

export function deactivate() {}
