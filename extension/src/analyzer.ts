export interface SyntaxIssue {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface FunctionInfo {
  name: string;
  isCommand: boolean;
  line: number;
  params: string[];
  locals: string[];
}

export interface AnalysisResult {
  isBalanced: boolean;
  openParens: number;
  closeParens: number;
  issues: SyntaxIssue[];
  functions: FunctionInfo[];
  totalLines: number;
}

export function analyzeAutoLispCode(text: string): AnalysisResult {
  const lines = text.split(/\r?\n/);
  const issues: SyntaxIssue[] = [];
  const functions: FunctionInfo[] = [];

  const parenStack: { line: number; column: number }[] = [];
  let inString = false;
  let inBlockComment = false;
  let escapeNext = false;
  let totalOpen = 0;
  let totalClose = 0;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let i = 0;

    // Check for defun definitions using regex on raw line
    const defunRegex = /\(\s*defun(-q)?\s+([a-zA-Z0-9:_\\-\\+\\*]+)\s*\(([^)]*)\)/gi;
    let match: RegExpExecArray | null;
    while ((match = defunRegex.exec(line)) !== null) {
      const rawName = match[2];
      const isCmd = rawName.toLowerCase().startsWith('c:');
      const paramStr = match[3].trim();
      const parts = paramStr.split('/');
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
      const nextChar = i + 1 < line.length ? line[i + 1] : '';

      if (inBlockComment) {
        if (char === '|' && nextChar === ';') {
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
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          inString = false;
        }
        i++;
        continue;
      }

      // Check start of block comment ;|
      if (char === ';' && nextChar === '|') {
        inBlockComment = true;
        i += 2;
        continue;
      }

      // Check line comment ;
      if (char === ';') {
        // Rest of line is comment
        break;
      }

      // Check string start
      if (char === '"') {
        inString = true;
        i++;
        continue;
      }

      // Parentheses tracking
      if (char === '(') {
        totalOpen++;
        parenStack.push({ line: l + 1, column: i + 1 });
      } else if (char === ')') {
        totalClose++;
        if (parenStack.length === 0) {
          issues.push({
            line: l + 1,
            column: i + 1,
            message: `Extra closing parenthesis ')' with no matching open '('`,
            severity: 'error'
          });
        } else {
          parenStack.pop();
        }
      }

      i++;
    }
  }

  // Any remaining open parens?
  while (parenStack.length > 0) {
    const unclosed = parenStack.pop()!;
    issues.push({
      line: unclosed.line,
      column: unclosed.column,
      message: `Unclosed open parenthesis '(' at line ${unclosed.line}, column ${unclosed.column}`,
      severity: 'error'
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
