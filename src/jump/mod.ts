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
import { getVisibleLines } from './get_lines'
import { Settings } from './settings'
import { ExtensionComponent, Nullable } from './typings'

const enum Command {
  Type = 'type',
  Exit = 'jump.exit',
  Enter = 'jump.jump-to-the-start-of-a-word',
  EnterEOW = 'jump.jump-to-the-end-of-a-word',
  EnterSelect = 'jump.select-to-the-start-of-a-word',
  EntereSelectEOW = 'jump.select-to-the-end-of-a-word',
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

function withDelay(
  _proto: object,
  _key: string | symbol,
  descriptor: TypedPropertyDescriptor<() => void>,
): void {
  let timeoutId: NodeJS.Timeout | null = null
  const { value } = descriptor

  if (typeof value !== 'function') {
    return
  }

  descriptor.value = function decorated(
    this: Jump,
    forceInvocation = true,
  ): void {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (forceInvocation) {
      timeoutId = null
      return value.call(this)
    }
    timeoutId = setTimeout((): void => {
      timeoutId = null
      value.call(this)
    }, 300)
  }
}

export class Jump implements ExtensionComponent {
  private handles: Record<Command | Event, Nullable<Disposable>>
  private settings: Settings
  private positions: JumpPositionMap
  private state: State

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
    this.handles[Command.EnterEOW] = commands.registerCommand(
      Command.EnterEOW,
      () => this.handleEnterJumpMode(false, false),
    )
    this.handles[Command.Exit] = commands.registerCommand(
      Command.Exit,
      this.handleExitJumpMode,
    )
    this.handles[Command.EnterSelect] = commands.registerCommand(
      Command.EnterSelect,
      () => this.handleEnterJumpMode(true, true),
    )
    this.handles[Command.EntereSelectEOW] = commands.registerCommand(
      Command.EntereSelectEOW,
      () => this.handleEnterJumpMode(false, true),
    )
    this.handles[Event.ConfigChanged] = workspace.onDidChangeConfiguration(
      this.handleConfigChange,
    )
    this.handles[Event.ActiveSelectionChanged] =
      window.onDidChangeTextEditorSelection(this.handleSelectionChange)
    this.handles[Event.ActiveEditorChanged] =
      window.onDidChangeActiveTextEditor(this.handleEditorChange)
    this.handles[Event.VisibleRangesChanged] =
      window.onDidChangeTextEditorVisibleRanges(this.handleVisibleRangesChange)
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

    this.showDecorations(false)
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

  private handleEnterJumpMode = (
    matchStartOfWord = true,
    expandSelection = false,
  ): void => {
    const activeEditor = window.activeTextEditor
    if (activeEditor === undefined) {
      return
    }

    this.setJumpContext(true)
    this.handles[Command.Type] = commands.registerCommand(
      Command.Type,
      this.handleTypeEvent,
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
    this.setJumpContext(false)
  }

  private handleTypeEvent = (type: { text: string }): void => {
    if (!TYPE_REGEX.test(type.text) || !this.state.isInJumpMode) {
      this.state.typedCharacters = ''
      return
    }

    if (this.state.typedCharacters.length === 0) {
      this.state.typedCharacters += type.text.toLowerCase()
      return
    }

    const code = this.state.typedCharacters + type.text.toLowerCase()
    const position = this.positions[code]

    if (position === undefined) {
      window.showErrorMessage(`Jump error, missing code: "${code}".`)
      this.handleExitJumpMode()
      return
    }

    if (this.state.expandSelection) {
      const { anchor } = this.state.editor.selection
      const active = new Position(position.line, position.char)
      this.state.editor.selection = new Selection(anchor, active)
    } else {
      this.state.editor.selection = new Selection(
        position.line,
        position.char,
        position.line,
        position.char,
      )
    }

    this.handleExitJumpMode()
  }

  private setJumpContext(value: boolean): void {
    commands.executeCommand('setContext', 'jump.isInJumpMode', value)
    this.state.isInJumpMode = value
  }

  private setDecorations(
    editor: TextEditor,
    decorationInstanceOptions: DecorationOptions[],
  ): void {
    if (editor !== undefined) {
      editor.setDecorations(
        this.settings.decorationType,
        decorationInstanceOptions,
      )
    }
  }

  @withDelay
  private showDecorations(_forceInvocation = true): void {
    const editor = this.state.editor || null
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

    for (let i = 0; i < linesCount && positionCount < maxDecorations; i++) {
      for (const match of lines[i].text.matchAll(scanRegexp)) {
        if (positionCount >= maxDecorations) {
          break
        }
        if (match.index === undefined) {
          continue
        }

        const code = this.settings.codes[positionCount]
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

        positionCount += 1
      }
    }

    this.setDecorations(editor, decorationOptions)
  }
}
