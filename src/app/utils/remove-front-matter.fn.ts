import { FRONT_MATTER_REGEX } from '../constants'

export const removeFrontMatter = (text: string) => {
    return text.replace(FRONT_MATTER_REGEX, '')
}
