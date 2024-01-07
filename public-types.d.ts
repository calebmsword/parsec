import { __factoryName__ } from "./src/lib/constants";

export interface Result {
    value?: any,
    reason?: any
}

export type Cancellor = (reason?: any) => void;

export type Receiver = (result: Result) => void;

export type Requestor = (receiver: Receiver, message?: any) => Cancellor|void;

export interface ParallelSpec {
    optionals?: Requestor[],
    timeLimit?: number,
    timeOption?: string,
    throttle?: number,
    [__factoryName__]?: string
}

export namespace parsec {

}
