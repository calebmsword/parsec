export interface ActionSpec<T> {
    value?: T,
    reason?: any,
    requestorIndex: number
}

export interface Reason extends Error {
    evidence?: any,
    stack?: string
    cause?: any
}

export type Action<T> = (spec: ActionSpec<T>) => void;
