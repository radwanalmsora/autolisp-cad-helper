import * as vscode from 'vscode';
import { analyzeAutoLispCode } from './analyzer';

let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Create diagnostic collection
  diagnosticCollection = vscode.languages.createDiagnosticCollection('autolisp');
  context.subscriptions.push(diagnosticCollection);

  // Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'autolisp.checkSyntax';
  context.subscriptions.push(statusBarItem);

  // Update status bar when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      updateStatusBar(editor);
    })
  );

  // Live syntax check on document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        if (isAutoLisp(event.document)) {
          runDiagnostics(event.document);
        }
      }
    })
  );

  // Command 1: Check Syntax & Balance
  const checkCmd = vscode.commands.registerCommand('autolisp.checkSyntax', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found.');
      return;
    }

    const doc = editor.document;
    const text = doc.getText();
    const result = analyzeAutoLispCode(text);

    runDiagnostics(doc);

    if (result.isBalanced) {
      vscode.window.showInformationMessage(
        `✅ AutoLISP Audit Passed! Perfectly balanced (${result.openParens} pairs) across ${result.totalLines} lines.`
      );
    } else {
      const firstIssue = result.issues[0];
      vscode.window.showErrorMessage(
        `❌ AutoLISP Syntax Issue: ${firstIssue.message}. Found ${result.issues.length} issue(s).`,
        'Jump to First Error'
      ).then(action => {
        if (action === 'Jump to First Error') {
          const pos = new vscode.Position(firstIssue.line - 1, Math.max(0, firstIssue.column - 1));
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }
      });
    }
  });

  // Command 2: List all defined functions & commands with QuickPick
  const listCmd = vscode.commands.registerCommand('autolisp.listFunctions', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found.');
      return;
    }

    const doc = editor.document;
    const result = analyzeAutoLispCode(doc.getText());

    if (result.functions.length === 0) {
      vscode.window.showInformationMessage('No defun functions found in this file.');
      return;
    }

    const items: vscode.QuickPickItem[] = result.functions.map(fn => ({
      label: fn.isCommand ? `$(terminal) ${fn.name}` : `$(symbol-function) ${fn.name}`,
      description: `Line ${fn.line} ${fn.isCommand ? '[AutoCAD Command]' : '[Subroutine]'}`,
      detail: `Args: (${fn.params.join(' ')}${fn.locals.length ? ` / ${fn.locals.join(' ')}` : ''})`
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${result.functions.length} function(s). Select one to jump:`
    });

    if (selected) {
      const match = selected.description?.match(/Line (\d+)/);
      if (match) {
        const line = parseInt(match[1], 10) - 1;
        const pos = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      }
    }
  });

  // Command 3: Insert Error Handler
  const errorHandlerCmd = vscode.commands.registerCommand('autolisp.insertErrorHandler', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const snippet = new vscode.SnippetString(
      [
        ";; -------------------------------------------------------------------------",
        ";; Standard Safe Error Handler",
        ";; -------------------------------------------------------------------------",
        "(defun *error* (msg)",
        "  (if (and msg (not (wcmatch (strcase msg t) \"*break*,*cancel*,*exit*\")))",
        "    (princ (strcat \"\\n[AutoLISP Error]: \" msg))",
        "  )",
        "  (if old_cmdecho (setvar \"CMDECHO\" old_cmdecho))",
        "  (if old_osmode  (setvar \"OSMODE\"  old_osmode))",
        "  (setq *error* nil)",
        "  (princ)",
        ")",
        ""
      ].join('\n')
    );

    editor.insertSnippet(snippet);
  });

  // Command 4: Insert File Header
  const headerCmd = vscode.commands.registerCommand('autolisp.insertHeader', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const snippet = new vscode.SnippetString(
      [
        ";; =========================================================================",
        ";; Project     : ${1:AutoCAD Automation Tools}",
        ";; File Name   : ${TM_FILENAME}",
        ";; Author      : ${2:radwanalmsora}",
        ";; Created     : ${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}",
        ";; Description : ${3:AutoCAD AutoLISP Routine}",
        ";; =========================================================================",
        "",
        ""
      ].join('\n')
    );

    editor.insertSnippet(snippet, new vscode.Position(0, 0));
  });

  context.subscriptions.push(checkCmd, listCmd, errorHandlerCmd, headerCmd);

  // Initialize status bar with active editor
  updateStatusBar(vscode.window.activeTextEditor);
}

function isAutoLisp(doc: vscode.TextDocument): boolean {
  return (
    doc.languageId === 'autolisp' ||
    doc.fileName.endsWith('.lsp') ||
    doc.fileName.endsWith('.mnl') ||
    doc.fileName.endsWith('.dcl')
  );
}

function runDiagnostics(doc: vscode.TextDocument) {
  if (!isAutoLisp(doc)) {
    diagnosticCollection.delete(doc.uri);
    return;
  }

  const result = analyzeAutoLispCode(doc.getText());
  const diagnostics: vscode.Diagnostic[] = [];

  for (const issue of result.issues) {
    const line = Math.max(0, issue.line - 1);
    const col = Math.max(0, issue.column - 1);
    const range = new vscode.Range(line, col, line, col + 1);

    const diag = new vscode.Diagnostic(
      range,
      issue.message,
      issue.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning
    );
    diag.source = 'AutoLISP';
    diagnostics.push(diag);
  }

  diagnosticCollection.set(doc.uri, diagnostics);
  updateStatusBarText(result);
}

function updateStatusBar(editor: vscode.TextEditor | undefined) {
  if (!editor || !isAutoLisp(editor.document)) {
    statusBarItem.hide();
    return;
  }

  const result = analyzeAutoLispCode(editor.document.getText());
  updateStatusBarText(result);
  statusBarItem.show();
}

function updateStatusBarText(result: ReturnType<typeof analyzeAutoLispCode>) {
  if (result.isBalanced) {
    statusBarItem.text = `$(pass) AutoLISP: Balanced (${result.openParens})`;
    statusBarItem.tooltip = `AutoLISP parentheses balance verified. Click to re-run audit.`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(error) AutoLISP: ${result.issues.length} Unbalanced`;
    statusBarItem.tooltip = `${result.issues[0]?.message}. Click to jump to issue.`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}
