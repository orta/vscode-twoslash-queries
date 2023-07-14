# vscode-twoslash-queries

A tiny extension for VS Code that lets you use `// ^?` inside your editor to inline highlight types. Re-uses the existing TypeScript tooling infra in `*.ts`, `*.tsx`, `*.js`, and `*.jsx` files, simply adding inline info.

Useful for keyboard warriors or folks working on complex types and want to see how changes propagate throughout other types.

## Features

**Key: You write `// ^?` anywhere in a source file (with whitespace before, between and middle being whatever) all that matters is the alignment of the `^`.**

In addition:

- End a line with `//=>` to highlight the leftmost named type.
- Use the `"TwoSlash Query: Insert Below"` command from the Command Palette or assign a keyboard shortcut to it (default: `Ctrl+K 6` on Windows, `Cmd+K 6` on Mac).

You can see here it in use a few times:

<img src="./vscode-twoslash.png" />

## Debugging

**Ensure that inlay hints are enabled in your VS Code settings.**


## Deployment

Bump version number.

VS Code:

1. `npx vsce publish`

OSVX:
1. `npx vsce package`
2. `ovsx publish vscode-twoslash-queries-*.vsix -p [token]`
3. `rm vscode-twoslash-queries-*.vsix`