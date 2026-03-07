import type { TypefullyDraft } from '../types/typefully-api.intf'

export const VIEW_TYPE_TYPEFULLY = 'typefully-view'

export type ViewPage =
    | { type: 'drafts-list' }
    | { type: 'draft-edit'; draftId: number; draft?: TypefullyDraft; sourceTab?: string }
    | { type: 'draft-create'; scheduledAt?: string; sourceTab?: string }
    | { type: 'queue' }
    | { type: 'queue-schedule' }
    | { type: 'posted-list' }
