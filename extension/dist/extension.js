var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// autolisp-vscode-extension/src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

// autolisp-vscode-extension/src/analyzer.ts
function analyzeAutoLispCode(text) {
  const lines = text.split(/\r?\n/);
  const issues = [];
  const functions = [];
  const parenStack = [];
  let inString = false;
  let inBlockComment = false;
  let escapeNext = false;
  let totalOpen = 0;
  let totalClose = 0;
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let i = 0;
    const defunRegex = /\(\s*defun(-q)?\s+([a-zA-Z0-9:_\\-\\+\\*]+)\s*\(([^)]*)\)/gi;
    let match;
    while ((match = defunRegex.exec(line)) !== null) {
      const rawName = match[2];
      const isCmd = rawName.toLowerCase().startsWith("c:");
      const paramStr = match[3].trim();
      const parts = paramStr.split("/");
      const params = parts[0] ? parts[0].trim().split(/\s+/).filter(Boolean) : [];
      const locals = parts[1] ? parts[1].trim().split(/\s+/).filter(Boolean) : [];
      functions.push({
        name: rawName,
        isCommand: isCmd,
        line: l + 1,
        params,
        locals
      });
    }
    while (i < line.length) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : "";
      if (inBlockComment) {
        if (char === "|" && nextChar === ";") {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }
      if (inString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (char === "\\") {
          escapeNext = true;
        } else if (char === '"') {
          inString = false;
        }
        i++;
        continue;
      }
      if (char === ";" && nextChar === "|") {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (char === ";") {
        break;
      }
      if (char === '"') {
        inString = true;
        i++;
        continue;
      }
      if (char === "(") {
        totalOpen++;
        parenStack.push({ line: l + 1, column: i + 1 });
      } else if (char === ")") {
        totalClose++;
        if (parenStack.length === 0) {
          issues.push({
            line: l + 1,
            column: i + 1,
            message: `Extra closing parenthesis ')' with no matching open '('`,
            severity: "error"
          });
        } else {
          parenStack.pop();
        }
      }
      i++;
    }
  }
  while (parenStack.length > 0) {
    const unclosed = parenStack.pop();
    issues.push({
      line: unclosed.line,
      column: unclosed.column,
      message: `Unclosed open parenthesis '(' at line ${unclosed.line}, column ${unclosed.column}`,
      severity: "error"
    });
  }
  return {
    isBalanced: issues.length === 0,
    openParens: totalOpen,
    closeParens: totalClose,
    issues,
    functions,
    totalLines: lines.length
  };
}

// autolisp-vscode-extension/src/extension.ts
var diagnosticCollection;
var statusBarItem;
function activate(context) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("autolisp");
  context.subscriptions.push(diagnosticCollection);
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "autolisp.checkSyntax";
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateStatusBar(editor);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        if (isAutoLisp(event.document)) {
          runDiagnostics(event.document);
        }
      }
    })
  );
  const checkCmd = vscode.commands.registerCommand("autolisp.checkSyntax", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active editor found.");
      return;
    }
    const doc = editor.document;
    const text = doc.getText();
    const result = analyzeAutoLispCode(text);
    runDiagnostics(doc);
    if (result.isBalanced) {
      vscode.window.showInformationMessage(
        `\u2705 AutoLISP Audit Passed! Perfectly balanced (${result.openParens} pairs) across ${result.totalLines} lines.`
      );
    } else {
      const firstIssue = result.issues[0];
      vscode.window.showErrorMessage(
        `\u274C AutoLISP Syntax Issue: ${firstIssue.message}. Found ${result.issues.length} issue(s).`,
        "Jump to First Error"
      ).then((action) => {
        if (action === "Jump to First Error") {
          const pos = new vscode.Position(firstIssue.line - 1, Math.max(0, firstIssue.column - 1));
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }
      });
    }
  });
  const listCmd = vscode.commands.registerCommand("autolisp.listFunctions", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active editor found.");
      return;
    }
    const doc = editor.document;
    const result = analyzeAutoLispCode(doc.getText());
    if (result.functions.length === 0) {
      vscode.window.showInformationMessage("No defun functions found in this file.");
      return;
    }
    const items = result.functions.map((fn) => ({
      label: fn.isCommand ? `$(terminal) ${fn.name}` : `$(symbol-function) ${fn.name}`,
      description: `Line ${fn.line} ${fn.isCommand ? "[AutoCAD Command]" : "[Subroutine]"}`,
      detail: `Args: (${fn.params.join(" ")}${fn.locals.length ? ` / ${fn.locals.join(" ")}` : ""})`
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
  const errorHandlerCmd = vscode.commands.registerCommand("autolisp.insertErrorHandler", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const snippet = new vscode.SnippetString(
      [
        ";; -------------------------------------------------------------------------",
        ";; Standard Safe Error Handler",
        ";; -------------------------------------------------------------------------",
        "(defun *error* (msg)",
        '  (if (and msg (not (wcmatch (strcase msg t) "*break*,*cancel*,*exit*")))',
        '    (princ (strcat "\\n[AutoLISP Error]: " msg))',
        "  )",
        '  (if old_cmdecho (setvar "CMDECHO" old_cmdecho))',
        '  (if old_osmode  (setvar "OSMODE"  old_osmode))',
        "  (setq *error* nil)",
        "  (princ)",
        ")",
        ""
      ].join("\n")
    );
    editor.insertSnippet(snippet);
  });
  const headerCmd = vscode.commands.registerCommand("autolisp.insertHeader", () => {
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
      ].join("\n")
    );
    editor.insertSnippet(snippet, new vscode.Position(0, 0));
  });
  context.subscriptions.push(checkCmd, listCmd, errorHandlerCmd, headerCmd);
  updateStatusBar(vscode.window.activeTextEditor);
}
function isAutoLisp(doc) {
  return doc.languageId === "autolisp" || doc.fileName.endsWith(".lsp") || doc.fileName.endsWith(".mnl") || doc.fileName.endsWith(".dcl");
}
function runDiagnostics(doc) {
  if (!isAutoLisp(doc)) {
    diagnosticCollection.delete(doc.uri);
    return;
  }
  const result = analyzeAutoLispCode(doc.getText());
  const diagnostics = [];
  for (const issue of result.issues) {
    const line = Math.max(0, issue.line - 1);
    const col = Math.max(0, issue.column - 1);
    const range = new vscode.Range(line, col, line, col + 1);
    const diag = new vscode.Diagnostic(
      range,
      issue.message,
      issue.severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
    );
    diag.source = "AutoLISP";
    diagnostics.push(diag);
  }
  diagnosticCollection.set(doc.uri, diagnostics);
  updateStatusBarText(result);
}
function updateStatusBar(editor) {
  if (!editor || !isAutoLisp(editor.document)) {
    statusBarItem.hide();
    return;
  }
  const result = analyzeAutoLispCode(editor.document.getText());
  updateStatusBarText(result);
  statusBarItem.show();
}
function updateStatusBarText(result) {
  if (result.isBalanced) {
    statusBarItem.text = `$(pass) AutoLISP: Balanced (${result.openParens})`;
    statusBarItem.tooltip = `AutoLISP parentheses balance verified. Click to re-run audit.`;
    statusBarItem.backgroundColor = void 0;
  } else {
    statusBarItem.text = `$(error) AutoLISP: ${result.issues.length} Unbalanced`;
    statusBarItem.tooltip = `${result.issues[0]?.message}. Click to jump to issue.`;
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
  }
}
function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
