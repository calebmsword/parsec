import { 
    __factoryName__, 
    FactoryName, 
    TimeOption 
} from "../../lib/constants.js";
import { parallel } from "../parallel/parallel.js";

/**
 * @template T 
 * @template [M = any]
 * @typedef {import("../../../public-types").Requestor<T, M>} Requestor<T, M>
 */

/**
 * Calls requestors in order, passing results from the previous to the next.
 * 
 * For HTTP/HTTPS requests, it is convenient to use nebula.
 * 
 * @example
 * ```
 * import parsec from "cms-parsec";
 * import { get, post } from "cms-nebula";
 * 
 * const saveGruyereToDatabase = parsec.sequence([
 *     // get a cheese:
 *     get("https://api.com/cheese/gruyere"),
 * 
 *     // post JSON response from get request to:
 *     post("https://my-database.com/api/cheeses")
 * ]);
 * 
 * // make request
 * saveGruyereToDatabase(({ value, reason }) => {
 *     if (value === undefined) {
 *         console.log("Failure because", reason);
 *         return;
 *     }
 *     
 *     console.log("Success!\n", value);
 * });
 * ```
 * 
 * More generally:
 * 
 * @example
 * ```
 * import parsec from "cms-parsec";
 * 
 * const mySequenceRequestor = parsec.sequence([
 *     (receiver, message) => {
 *         // gets intial message, passes along 
 *         // new message through value
 *         receiver({ value: message + " world"});
 *     },
 *     (receiver, message) => {
 *         // receives previous requestor result 
 *         // value as message 
 *         receiver({ value: message + "!"});
 *     }
 * ]);
 * 
 * mySequenceRequestor(({ value }) => {
 *     console.log(value);  // "Hello world!"
 * 
 * // pass an optional initial message
 * }, "Hello");
 * ```
 * 
 * Important details:
 *  - Success occurs when every requestor succeeds. If any failure occurs in 
 * some requestor or the optional time limit is reached before the sequence 
 * ends, the sequence fails.
 *  - The requestor returned by `parallel` has a cancellor. It calls the 
 * cancellors for any pending requestors in the sequence.
 *  - Each requestor is called **asycnhronously**, even if the requestor 
 * itself is fully synchronous.
 * 
 * @template T
 * The type of `value` property in the {@link Result} for the requestor 
 * returned by this factory.
 * @template M
 * The type of the initial message for the requestor returned by this 
 * factory.
 * 
 * @param {[Requestor<any, M>, ...Requestor<any>[], Requestor<T>]} requestors 
 * An array of requestors.
 * @param {object} [spec={}] 
 * Configures sequence.
 * @param {number} [spec.timeLimit] 
 * An time limit, in milliseconds, that the sequence must finish before.
 * @param {import("../../../public-types").SetTimeoutLike} [spec.eventLoopAdapter]
 * See the documentation for `run`.
 * @param {boolean} [spec.ptcMode = false]
 * See the documentation for `run`.
 * @returns {Requestor<T, M>} 
 * The sequence requestor. Upon execution, starts the sequence.
 */
export function sequence(requestors, spec = {}) {
    const { timeLimit, eventLoopAdapter, ptcMode = false } = spec;

    // @ts-ignore
    // The Requestor<Result<T>, M> type only occurs if __factoryName__ is not 
    // FactoryName.SEQUENCE, but TypeScript doesn't know that
    return parallel(requestors, {
        timeLimit,
        timeOption: TimeOption.SKIP_OPTIONALS_IF_TIME_REMAINS,
        throttle: 1,
        eventLoopAdapter,
        ptcMode,
        // @ts-ignore, secret undocumented parameter
        [__factoryName__]: FactoryName.SEQUENCE
    });
}
