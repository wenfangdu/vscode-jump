import { Jump } from './jump/mod'

const jump = new Jump()

export const activate = (): void => jump.activate()

export const deactivate = (): void => jump.deactivate()
