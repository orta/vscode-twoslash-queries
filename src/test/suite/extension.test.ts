import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { getHoverDisplayString, getHoverStart } from '../../helpers';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('extracts type information from an LSP markdown hover', () => {
		const contents = [new vscode.MarkdownString('```typescript\nconst value: string\n```\n\nThe value.')];

		assert.strictEqual(getHoverDisplayString(contents), 'const value: string');
	});

	test('extracts type information from a marked string hover', () => {
		const contents: vscode.MarkedString[] = [{ language: 'typescript', value: 'const value: string' }];

		assert.strictEqual(getHoverDisplayString(contents), 'const value: string');
	});

	test('converts a hover range to a line-relative one-based offset', () => {
		const hover = new vscode.Hover([], new vscode.Range(4, 6, 4, 11));

		assert.deepStrictEqual(getHoverStart(hover), { offset: 7 });
	});

	test('preserves hover alignment at column zero', () => {
		const hover = new vscode.Hover([], new vscode.Range(4, 0, 4, 5));

		assert.deepStrictEqual(getHoverStart(hover), { offset: 1 });
	});
});
