import {
  commands,
  ConfigurationChangeEvent,
  DecorationOptions,
  Disposable,
  Position,
  Range,
  Selection,
  TextEditor,
  window,
  workspace,
} from 'vscode'
import { getVisibleLines } from './get-lines'
import { Settings } from './settings'
import { ExtensionComponent, Nullable } from './typings'

const enum Command {
  Type = 'type',
  ReplacePreviousChar = 'replacePreviousChar',
  Exit = 'jump-extension.exit',
  Enter = 'jump-extension.jump-to-the-start-of-a-word',
  EnterEOW = 'jump-extension.jump-to-the-end-of-a-word',
  EnterSelect = 'jump-extension.select-to-the-start-of-a-word',
  EntereSelectEOW = 'jump-extension.select-to-the-end-of-a-word',
}

const enum Event {
  ConfigChanged = 'configChanged',
  ActiveEditorChanged = 'activeEditorChanged',
  ActiveSelectionChanged = 'activeSelectionChanged',
  VisibleRangesChanged = 'visibleRangesChanged',
}

interface JumpPosition {
  line: number
  char: number
}

interface JumpPositionMap {
  [code: string]: JumpPosition
}

interface StateJumpActive {
  isInJumpMode: true
  matchStartOfWord: boolean
  expandSelection: boolean
  editor: TextEditor
  typedCharacters: string
}

interface StateJumpInactive {
  isInJumpMode: false
  matchStartOfWord: boolean
  expandSelection: boolean
  editor: undefined
  typedCharacters: string
}

type State = StateJumpActive | StateJumpInactive

const HANDLE_NAMES = [
  Command.Type,
  Command.ReplacePreviousChar,
  Command.Exit,
  Command.Enter,
  Command.EnterEOW,
  Command.EnterSelect,
  Command.EntereSelectEOW,
  Event.ConfigChanged,
  Event.ActiveEditorChanged,
  Event.ActiveSelectionChanged,
  Event.VisibleRangesChanged,
] as const
const NO_DECORATIONS: DecorationOptions[] = []
const DEFAULT_STATE: State = {
  isInJumpMode: false,
  editor: undefined,
  typedCharacters: '',
  matchStartOfWord: true,
  expandSelection: false,
}
const TYPE_REGEX = /\w/

export class Jump implements ExtensionComponent {
  private handles: Record<Command | Event, Nullable<Disposable>>
  private settings: Settings
  private positions: JumpPositionMap
  private state: State
  private timeout?: NodeJS.Timeout

  public constructor() {
    this.state = {
      isInJumpMode: false,
      matchStartOfWord: true,
      expandSelection: false,
      editor: undefined,
      typedCharacters: '',
    }
    this.handles = {
      [Command.Type]: null,
      [Command.ReplacePreviousChar]: null,
      [Command.Exit]: null,
      [Command.Enter]: null,
      [Command.EnterEOW]: null,
      [Command.EnterSelect]: null,
      [Command.EntereSelectEOW]: null,
      [Event.ConfigChanged]: null,
      [Event.ActiveEditorChanged]: null,
      [Event.ActiveSelectionChanged]: null,
      [Event.VisibleRangesChanged]: null,
    }
    this.settings = new Settings()
    this.positions = {}
  }

  public activate(): void {
    this.settings.activate()

    this.handles[Command.Enter] = commands.registerCommand(Command.Enter, () =>
      this.handleEnterJumpMode(true, false),
    )
    this.handles[Command.EnterEOW] = commands.registerCommand(Command.EnterEOW, () =>
      this.handleEnterJumpMode(false, false),
    )
    this.handles[Command.Exit] = commands.registerCommand(Command.Exit, this.handleExitJumpMode)
    this.handles[Command.EnterSelect] = commands.registerCommand(Command.EnterSelect, () =>
      this.handleEnterJumpMode(true, true),
    )
    this.handles[Command.EntereSelectEOW] = commands.registerCommand(Command.EntereSelectEOW, () =>
      this.handleEnterJumpMode(false, true),
    )
    this.handles[Event.ConfigChanged] = workspace.onDidChangeConfiguration(this.handleConfigChange)
    this.handles[Event.ActiveSelectionChanged] = window.onDidChangeTextEditorSelection(
      this.handleSelectionChange,
    )
    this.handles[Event.ActiveEditorChanged] = window.onDidChangeActiveTextEditor(
      this.handleEditorChange,
    )
    this.handles[Event.VisibleRangesChanged] = window.onDidChangeTextEditorVisibleRanges(
      this.handleVisibleRangesChange,
    )
  }

  public deactivate(): void {
    this.handleExitJumpMode()
    this.settings.deactivate()

    for (const handleName of HANDLE_NAMES) {
      this.tryDispose(handleName)
    }
  }

  private handleConfigChange = (event: ConfigurationChangeEvent): void => {
    if (this.state.isInJumpMode) {
      this.setDecorations(this.state.editor, NO_DECORATIONS)
      this.settings.handleConfigurationChange(event)
      this.showDecorations()
    } else {
      this.settings.handleConfigurationChange(event)
    }
  }

  private handleVisibleRangesChange = (): void => {
    if (!this.state.isInJumpMode) {
      return
    }

    this.timeout && clearTimeout(this.timeout)

    this.timeout = setTimeout(() => this.showDecorations(), 300)
  }

  private handleSelectionChange = (): void => {
    if (!this.state.isInJumpMode) {
      return
    }

    this.showDecorations()
  }

  private handleEditorChange = (editor: TextEditor | undefined): void => {
    if (!this.state.isInJumpMode) {
      return
    }

    if (editor === undefined) {
      this.handleExitJumpMode()
    } else {
      this.setDecorations(this.state.editor, NO_DECORATIONS)
      this.state.editor = editor
      this.showDecorations()
    }
  }

  private tryDispose(handleName: Command | Event): void {
    const handle = this.handles[handleName]
    if (handle) {
      handle.dispose()
      this.handles[handleName] = null
    }
  }

  private handleEnterJumpMode = (matchStartOfWord = true, expandSelection = false): void => {
    if (this.state.isInJumpMode) {
      if (
        this.state.matchStartOfWord === matchStartOfWord &&
        this.state.expandSelection === expandSelection
      ) {
        return this.handleExitJumpMode()
      } else {
        this.handleExitJumpMode()
      }
    }

    const activeEditor = window.activeTextEditor
    if (activeEditor === undefined) {
      return
    }

    this.setJumpContext(true)
    this.handles[Command.Type] = commands.registerCommand(Command.Type, this.handleTypeEvent)
    this.handles[Command.ReplacePreviousChar] = commands.registerCommand(
      Command.ReplacePreviousChar,
      // TODO noop extract
      () => {},
    )

    this.state.matchStartOfWord = matchStartOfWord
    this.state.expandSelection = expandSelection
    this.state.editor = activeEditor

    this.showDecorations()
  }

  private handleExitJumpMode = (): void => {
    if (!this.state.isInJumpMode) {
      return
    }

    this.setDecorations(this.state.editor, NO_DECORATIONS)
    this.state = { ...DEFAULT_STATE }

    this.tryDispose(Command.Type)
    this.tryDispose(Command.ReplacePreviousChar)
    this.setJumpContext(false)
  }

  private handleTypeEvent = ({ text }: { text: string }): void => {
    if (!TYPE_REGEX.test(text) || !this.state.isInJumpMode) {
      this.state.typedCharacters = ''
      return
    }

    if (this.state.typedCharacters.length === 0) {
      this.state.typedCharacters += text.toLowerCase()
      return
    }

    const code = this.state.typedCharacters + text.toLowerCase()
    const position = this.positions[code]

    if (position === undefined) {
      window.showErrorMessage(`Jump error, missing code: "${code}".`)
      this.handleExitJumpMode()
      return
    }

    if (this.state.expandSelection) {
      const [{ anchor }] = this.state.editor.selections.slice(-1)
      const active = new Position(position.line, position.char)
      this.state.editor.selection = new Selection(anchor, active)

      if (this.settings.cursorSurroundingLines) {
        commands.executeCommand('cursorLeftSelect')
        commands.executeCommand('cursorRightSelect')
      }
    } else {
      this.state.editor.selection = new Selection(
        position.line,
        position.char,
        position.line,
        position.char,
      )

      if (this.settings.cursorSurroundingLines) {
        commands.executeCommand('cursorLeft')
        commands.executeCommand('cursorRight')
      }
    }

    this.handleExitJumpMode()
  }

  private setJumpContext(value: boolean): void {
    commands.executeCommand('setContext', 'jump.isInJumpMode', value)
    this.state.isInJumpMode = value
  }

  private setDecorations(editor: TextEditor, decorationInstanceOptions: DecorationOptions[]): void {
    editor.setDecorations(this.settings.decorationType, decorationInstanceOptions)
  }

  private showDecorations(): void {
    const editor = this.state.editor ?? null
    const lines = editor && getVisibleLines(editor)

    if (!editor || lines === null) {
      return
    }

    const scanRegexp = this.state.matchStartOfWord
      ? this.settings.wordRegexp
      : this.settings.endOfWordRegexp
    const decorationOptions: DecorationOptions[] = []

    this.positions = {}
    let positionCount = 0
    const linesCount = lines.length
    const maxDecorations = this.settings.codes.length

    for (let i = 0; i < linesCount && positionCount < maxDecorations; ++i) {
      const matches = [...lines[i].text.matchAll(scanRegexp)]

      const [{ active }] = editor.selections.slice(-1)

      if (lines[i].lineNumber === active.line) {
        matches.sort(
          (a, b) =>
            Math.abs(active.character - (a.index ?? Infinity)) -
            Math.abs(active.character - (b.index ?? Infinity)),
        )
      }

      for (const match of matches) {
        if (positionCount >= maxDecorations) {
          break
        }
        if (match.index === undefined) {
          continue
        }

        const code = this.settings.codes[positionCount++]
        const position = {
          line: lines[i].lineNumber,
          char: match.index,
        }

        const { line } = position
        const char = position.char + this.settings.charOffset

        this.positions[code] = position
        decorationOptions.push({
          range: new Range(line, char, line, char),
          renderOptions: this.settings.getOptions(code),
        })
      }
    }

    this.setDecorations(editor, decorationOptions)
  }
}
