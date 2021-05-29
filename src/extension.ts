import { Jump } from './jump/mod'

const jump = new Jump()

export const activate = () => jump.activate()

export const deactivate = () => jump.deactivate()
