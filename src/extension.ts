import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const provider: vscode.InlayHintsProvider = {
    provideInlayHints: async (model, iRange, cancel) => {
      const offset = model.offsetAt(iRange.start);
      const text = model.getText(iRange);
      const results: vscode.InlayHint[] = [];

      const m = text.matchAll(/^\s*\/\/\s*\^\?/gm);
      for (const match of m) {
        if (match.index === undefined) {
          return;
        }

        const end = match.index + match[0].length - 1;
        // Add the start range for the inlay hint
        const endPos = model.positionAt(end + offset);
        const inspectionPos = new vscode.Position(
          endPos.line - 1,
          endPos.character
        );

        if (cancel.isCancellationRequested) {
          return [];
        }

        const { scheme, fsPath, authority, path } = model.uri;
        const hint: any = await vscode.commands.executeCommand(
          "typescript.tsserverRequest",
          "quickinfo",
          {
            _: "%%%",
            file: scheme === 'file' ? fsPath : `^/${scheme}/${authority || 'ts-nul-authority'}/${path.replace(/^\//, '')}`,
            line: inspectionPos.line + 1,
            offset: inspectionPos.character,
          }
        );

        if (!hint || !hint.body) {
          continue;
        }

        // Make a one-liner
        let text = hint.body.displayString
          .replace(/\\n/g, " ")
          .replace(/\/n/g, " ")
          .replace(/  /g, " ")
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        if (text.length > 120) {
          text = text.slice(0, 119) + "...";
        }

        const inlay: vscode.InlayHint = {
          kind: 0,
          position: new vscode.Position(endPos.line, endPos.character + 1),
          label: text,
          paddingLeft: true,
        };
        results.push(inlay);
      }
      return results;
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
