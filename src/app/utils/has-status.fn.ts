interface Statused {
    status: number
}

export const hasStatus = (obj: unknown): obj is Statused => {
    return (obj as Statused)?.status !== undefined && 'number' === typeof (obj as Statused).status
}
