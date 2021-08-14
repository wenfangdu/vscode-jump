import { TextEditor, TextLine } from 'vscode'

export function getVisibleLines(editor: TextEditor): null | TextLine[] {
  const { document } = editor
  const { visibleRanges, selections } = editor

  const visibleLineNumbers = []
  for (const range of visibleRanges) {
    let lineNumber = range.start.line
    while (lineNumber <= range.end.line) {
      visibleLineNumbers.push(lineNumber)
      ++lineNumber
    }
  }

  const cursorLineIndex = visibleLineNumbers.indexOf(selections.slice(-1)[0].active.line)
  // prettier-ignore
  const startLineIndex = cursorLineIndex === -1 ? Math.floor(visibleLineNumbers.length / 2) : cursorLineIndex

  let leftIndex = startLineIndex - 1
  let rightIndex = startLineIndex + 1

  const visibleLines: TextLine[] = [document.lineAt(visibleLineNumbers[startLineIndex])]
  const maxRightIndex = visibleLineNumbers.length

  while (leftIndex > -1 || rightIndex < maxRightIndex) {
    if (leftIndex > -1) {
      visibleLines.push(document.lineAt(visibleLineNumbers[leftIndex--]))
    }
    if (rightIndex < maxRightIndex) {
      visibleLines.push(document.lineAt(visibleLineNumbers[rightIndex++]))
    }
  }

  return visibleLines.filter((textLine): boolean => textLine.isEmptyOrWhitespace === false)
}
