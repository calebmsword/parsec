export interface Result {
    value?: any,
    reason?: any
}

export type Cancellor = (reason?: any) => void;

export type Receiver = (result: Result) => void;

export type Requestor = (receiver: Receiver, message?: any) => Cancellor|void;

export namespace parsec {

}
