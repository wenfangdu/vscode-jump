import {
  ConfigurationChangeEvent,
  DecorationInstanceRenderOptions,
  TextEditorDecorationType,
  ThemableDecorationAttachmentRenderOptions,
  ThemableDecorationRenderOptions,
  Uri,
  window,
  workspace,
} from 'vscode'
import { createCharCodeSet } from './char_code'
import { ExtensionComponent } from './typings'

export const enum SettingNamespace {
  Editor = 'editor',
  Jump = 'jump',
}

const enum Setting {
  UseIcons = 'useIcons',
  WordRegexp = 'wordRegexp',
  WordRegexpFlags = 'wordRegexpFlags',
  WordRegexpEndOfWord = 'wordRegexpEndOfWord',
  PrimaryCharset = 'primaryCharset',
  FontFamily = 'fontFamily',
  FontSize = 'fontSize',
}

const enum DisplaySetting {
  Color = 'display.color',
  BackgroundColor = 'display.backgroundColor',
}

interface DecorationOptions {
  pad: number
  color: string
  width: number
  height: number
  fontSize: number
  fontFamily: string
  backgroundColor: string
  margin?: string
}

// Default values
const DEFAULT_REGEX_FLAGS = 'gi'
const DEFAULT_JUMP_REGEXP = /\w{2,}/g
const DEFAUlT_JUMP_REGEXP_EOW = /(?<=\w{2})(\b|-|\s)/gi

const DATA_URI = Uri.parse('data:')

const DEFAULT_COLOR = '#0af0c1'
const DEFAULT_BACKGROUND_COLOR = '#004455'

export class Settings implements ExtensionComponent {
  private decorationOptions: DecorationOptions
  private codeOptions: Map<string, DecorationInstanceRenderOptions>
  public codes: string[]
  public decorationType: TextEditorDecorationType
  public wordRegexp: RegExp
  public endOfWordRegexp: RegExp
  public charOffset: number

  public constructor() {
    this.decorationOptions = {} as unknown as DecorationOptions
    this.decorationType = window.createTextEditorDecorationType({})
    this.codeOptions = new Map()
    this.codes = []
    this.wordRegexp = DEFAULT_JUMP_REGEXP
    this.endOfWordRegexp = DEFAUlT_JUMP_REGEXP_EOW
    this.charOffset = 0
  }

  public activate(): void {
    this.update()
  }

  public deactivate(): void {
    this.codes = []
    this.codeOptions.clear()
  }

  public getOptions(code: string): DecorationInstanceRenderOptions {
    return this.codeOptions.get(code) as DecorationInstanceRenderOptions
  }

  public update(): void {
    this.buildDecorationType()
    this.buildWordRegexp()
    this.buildCharset()
    this.buildCodeOptions()
  }

  public handleConfigurationChange(event: ConfigurationChangeEvent): boolean {
    if (event.affectsConfiguration(SettingNamespace.Jump)) {
      this.update()
      return true
    } else if (event.affectsConfiguration(SettingNamespace.Editor)) {
      this.buildDecorationType()
      this.buildCodeOptions()
      return true
    } else {
      return false
    }
  }

  private buildDecorationType(): void {
    const jumpConfig = workspace.getConfiguration(SettingNamespace.Jump)
    const editorConfig = workspace.getConfiguration(
      SettingNamespace.Editor,
      null,
    )
    const useIcons = Boolean(jumpConfig.get<boolean>(Setting.UseIcons))

    this.charOffset = useIcons ? 2 : 0

    const fontFamily = editorConfig.get(Setting.FontFamily) as string
    const fontSize = editorConfig.get(Setting.FontSize) as number
    const color = jumpConfig.get<string>(DisplaySetting.Color) || DEFAULT_COLOR
    const backgroundColor =
      jumpConfig.get<string>(DisplaySetting.BackgroundColor) ||
      DEFAULT_BACKGROUND_COLOR

    const pad = 2 * Math.ceil(fontSize / (10 * 2))
    const width = fontSize + pad * 2

    const options = {
      pad,
      fontSize,
      fontFamily,
      color,
      backgroundColor,
      width,
      height: fontSize,
    }

    const decorationTypeOptions:
      | ThemableDecorationAttachmentRenderOptions
      | ThemableDecorationRenderOptions = useIcons
      ? {
          width: `${width}px`,
          height: `${fontSize}px`,
          margin: `0 0 0 -${width}px`,
        }
      : {
          width: `${width}px`,
          height: `${fontSize}px`,
          color,
          backgroundColor,
        }

    this.decorationOptions = options
    this.decorationType = window.createTextEditorDecorationType({
      after: decorationTypeOptions,
    })
  }

  private buildWordRegexp(): void {
    const jumpConfig = workspace.getConfiguration(SettingNamespace.Jump)
    const userWordRegex = jumpConfig[Setting.WordRegexp]
    const userEndOfWordRegex = jumpConfig[Setting.WordRegexpEndOfWord]
    const userWordRegexFlags =
      jumpConfig[Setting.WordRegexpFlags] || DEFAULT_REGEX_FLAGS

    if (userWordRegex && userWordRegex.length > 0) {
      this.wordRegexp = new RegExp(userWordRegex, userWordRegexFlags)
    }

    if (userEndOfWordRegex && userEndOfWordRegex.length > 0) {
      this.endOfWordRegexp = new RegExp(userEndOfWordRegex, userWordRegexFlags)
    }
  }

  private buildCharset(): void {
    const jumpConfig = workspace.getConfiguration(SettingNamespace.Jump)
    const charsetSetting = jumpConfig.get<string>(Setting.PrimaryCharset)
    const charset =
      charsetSetting && charsetSetting.length
        ? charsetSetting.toLowerCase().split('')
        : undefined
    this.codes = createCharCodeSet(charset)
  }

  private buildCodeOptions(): void {
    const settings = workspace.getConfiguration(SettingNamespace.Jump)
    const useIcons = Boolean(settings.get<boolean>(Setting.UseIcons))
    const [codePrefix, codeSuffix] = useIcons
      ? this.createCodeAffixes()
      : ['', '']

    for (const code of this.codes) {
      this.codeOptions.set(
        code,
        this.createRenderOptions(useIcons, `${codePrefix}${code}${codeSuffix}`),
      )
    }
  }

  private createRenderOptions(
    useIcons: boolean,
    optionValue: string,
  ): DecorationInstanceRenderOptions {
    const key = useIcons ? 'contentIconPath' : 'contentText'
    const value = useIcons ? DATA_URI.with({ path: optionValue }) : optionValue

    return {
      dark: {
        after: {
          [key]: value,
        },
      },
      light: {
        after: {
          [key]: value,
        },
      },
    }
  }

  private createCodeAffixes(): [string, string] {
    const { pad, fontSize, backgroundColor, fontFamily, color, width, height } =
      this.decorationOptions
    const halfOfPad = pad >> 1

    return [
      `image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" height="${height}" width="${
        width + 5
      }"><rect width="${width}" height="${height}" rx="2" ry="2" fill="${backgroundColor}"></rect><text font-family="${fontFamily}" font-size="${fontSize}px" textLength="${
        width - pad
      }" fill="${color}" x="${halfOfPad}" y="${fontSize * 0.8}">`,
      `</text></svg>`,
    ]
  }
}
