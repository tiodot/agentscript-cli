export class PythonWriter {
  private lines: string[] = [];
  private indentLevel: number = 0;
  private imports: Set<string> = new Set();
  private fromImports: Map<string, Set<string>> = new Map();

  setIndent(level: number): void {
    this.indentLevel = level;
  }

  getIndent(): number {
    return this.indentLevel;
  }

  writeLine(line: string): void {
    const indent = '    '.repeat(this.indentLevel);
    this.lines.push(indent + line);
  }

  writeBlankLine(): void {
    this.lines.push('');
  }

  addImport(module: string): void {
    this.imports.add(module);
  }

  addImportFrom(module: string, name: string): void {
    if (!this.fromImports.has(module)) {
      this.fromImports.set(module, new Set());
    }
    this.fromImports.get(module)!.add(name);
  }

  getImportLines(): string[] {
    const result: string[] = [];
    const sortedImports = [...this.imports].sort();
    for (const imp of sortedImports) {
      result.push(`import ${imp}`);
    }
    if (sortedImports.length > 0 && this.fromImports.size > 0) {
      result.push('');
    }
    const sortedFrom = [...this.fromImports.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [module, names] of sortedFrom) {
      const sortedNames = [...names].sort();
      result.push(`from ${module} import ${sortedNames.join(', ')}`);
    }
    return result;
  }

  toString(): string {
    const importLines = this.getImportLines();
    const codeLines = this.lines;
    const allLines = [...importLines];
    if (importLines.length > 0 && codeLines.length > 0) {
      allLines.push('');
    }
    allLines.push(...codeLines);
    return allLines.join('\n') + '\n';
  }

  /** Return code lines only (no import block). */
  toCodeOnly(): string {
    return this.lines.join('\n') + '\n';
  }

  /** Merge imports from another PythonWriter into this one. */
  mergeImportsFrom(other: PythonWriter): void {
    for (const imp of other.imports) {
      this.imports.add(imp);
    }
    for (const [module, names] of other.fromImports) {
      if (!this.fromImports.has(module)) {
        this.fromImports.set(module, new Set());
      }
      for (const name of names) {
        this.fromImports.get(module)!.add(name);
      }
    }
  }

  static join(writers: PythonWriter[], separator: string = '\n\n'): string {
    return writers.map(w => w.toString().trimEnd()).join(separator) + '\n';
  }
}