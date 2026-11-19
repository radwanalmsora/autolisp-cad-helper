# AutoLISP & CAD Pro Assistant 📐✨

[![VS Code Marketplace](https://img.shields.io/badge/VS_Code-Extension-007ACC?logo=visualstudiocode)](https://marketplace.visualstudio.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/radwanalmsora/autolisp-cad-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, powerful, and all-in-one Visual Studio Code extension designed for AutoCAD developers and CAD drafting specialists working with **AutoLISP (`.lsp`, `.mnl`)** and **Dialog Control Language (`.dcl`)**.

---

## 🚀 Key Features

* **🎨 Rich Syntax Highlighting:** Full syntax recognition for AutoLISP keywords, AutoCAD core functions (`command`, `entsel`, `ssget`, `entget`), Visual LISP APIs (`vla-*`, `vlax-*`, `vlr-*`), DXF group codes, numbers, and strings.
* **🔍 Parentheses Balance Audit:** Real-time detection of unbalanced open or closed parentheses with line and column precision. Never lose minutes searching for an unclosed bracket!
* **⚡ Smart Production Snippets:** Instant templates for command definitions (`defunc`), subroutines (`defun`), selection set iterators (`ssloop`), conditional blocks (`cond`), and safe `*error*` handlers.
* **📋 Function & Command Navigator:** QuickPick modal (`Ctrl+Shift+P` -> `AutoLISP: List All Defined Functions`) allowing one-click jumping to any subroutine or `c:command` in the file.
* **🛡️ Safe Error Handling Template:** Quick insertion of standard AutoCAD error handling that protects `CMDECHO`, `OSMODE`, and closes active undo marks on user cancel.
* **📊 Live Status Bar Indicator:** Shows real-time balance status (`Balanced (142 pairs)` or `Unbalanced`) directly in your status bar.

---

## ⌨️ Commands & Shortcuts

| Command | Shortcut | Description |
|---|---|---|
| `AutoLISP: Audit Parentheses & Syntax Balance` | `Ctrl+Alt+L` / `Cmd+Alt+L` | Audits parentheses balance across the entire file |
| `AutoLISP: List All Defined Functions & Commands` | `Ctrl+Shift+P` | Search and jump to any function in the file |
| `AutoLISP: Insert Production Error Handler` | `Ctrl+Shift+P` | Inserts protected `*error*` boilerplate |
| `AutoLISP: Insert Professional File Header` | `Ctrl+Shift+P` | Inserts file metadata header at top of file |

---

## 📦 How to Install (`.vsix`)

1. Open **Visual Studio Code**.
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open the **Extensions** view.
3. Click the three dots `...` (More Actions) at the top of the Extensions view.
4. Select **Install from VSIX...**.
5. Select `autolisp-cad-helper-1.0.0.vsix` and click **Install**.

---

## 📄 License

MIT License © 2026 radwanalmsora.
