export interface ActionSpec {
    value?: any,
    reason?: any,
    requestorIndex?: number
}

export interface Reason extends Error {
    evidence?: any,
    stack?: string
    cause?: any
}

export type Action = (spec: ActionSpec) => void;
