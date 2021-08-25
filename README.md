# Jump

[![Version](https://vsmarketplacebadge.apphb.com/version-short/wenfangdu.jump.svg)](https://marketplace.visualstudio.com/items?itemName=wenfangdu.jump)
[![License](https://img.shields.io/github/license/wenfangdu/vscode-jump?color=brightgreen)](https://github.com/wenfangdu/vscode-jump/blob/main/LICENSE)
[![Twitter](https://img.shields.io/twitter/url?url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dwenfangdu.jump)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dwenfangdu.jump)

> 🏃‍♂️ Jump/Select to the Start/End of a word in VSCode

[💿 Install Via Marketplace](https://marketplace.visualstudio.com/items?itemName=wenfangdu.jump)

## Commands

- `Jump to the Start of a word`
- `Jump to the End of a word`
- `Select to the Start of a word`
- `Select to the End of a word`
- `Exit jump mode`

## Demos

- `Jump to the Start of a word`

  ![Jump to the Start of a word](https://raw.githubusercontent.com/wenfangdu/vscode-jump/main/images/jump-to-the-start-of-a-word.gif)

- `Jump to the End of a word`

  ![Jump to the End of a word](https://raw.githubusercontent.com/wenfangdu/vscode-jump/main/images/jump-to-the-end-of-a-word.gif)

- `Select to the Start of a word`

  ![Select to the Start of a word](https://raw.githubusercontent.com/wenfangdu/vscode-jump/main/images/select-to-the-start-of-a-word.gif)

- `Select to the End of a word`

  ![Select to the End of a word](https://raw.githubusercontent.com/wenfangdu/vscode-jump/main/images/select-to-the-end-of-a-word.gif)

- `Exit jump mode`

  ![Exit jump mode](https://raw.githubusercontent.com/wenfangdu/vscode-jump/main/images/exit-jump-mode.gif)

## Known Issue

Due to [a blocked VSCode issue](https://github.com/microsoft/vscode/issues/13441), Jump doesn't work with extensions that overwrite the [`type`](https://github.com/microsoft/vscode/blob/32659246788863a0783299f2ef93e6e4ccd9e0b4/src/vs/editor/browser/view/viewController.ts#L39) command, such as [VSCodeVim](https://marketplace.visualstudio.com/items?itemName=vscodevim.vim).

## Inspired By

- [Jumpy Extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=wmaurer.vscode-jumpy)
- [VSCodeVim](https://marketplace.visualstudio.com/items?itemName=vscodevim.vim)
