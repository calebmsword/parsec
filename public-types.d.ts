import { __factoryName__ } from "./src/lib/constants";
import { sequence, parallel, race, fallback } from "./src/parsec";

/**
 * How the result of a requestor's unit of work is represented.
 * @Template T
 * The type of the `value` property will have if the Result is successful. If 
 * no type is provided, then `T` will be `any`.
 */
export interface Result<T> {
    value?: T,
    reason?: any
}

/**
 * Represents the result of a requestor whose unit of work resulted in success.
 * This is a specific type of {@link Result}.
 * @template T
 * The type of the `value` property in the {@link Result} object. 
 */
export type Success<T extends number|string|boolean|object|symbol|bigint|null> = 
    Result<T>

/**
 * Represents a requestor whose unit of work resulted in failure.
 * This is a specific type of {@link Result}.
 */
export type Failure = Result<undefined>;

/**
 * A function which should cancel the work associated with a requestor.
 * Many requestors make some request to a remote server, so a `Cancellor` cannot 
 * guarantee that the cancellation will occur. It can only guarantee an attempt.
 * @param {any} [reason]
 * An optional `reason` which can be provided to the `Cancellor`.
 */
export type Cancellor = (reason?: any) => void;

/**
 * A callback that is executed when a requestor completes its work.
 * @template T
 * The type of the `value` property of the result if the requestor is 
 * successful.
 * @param {Success|Failure} result
 * The result of the requestor's work.
 */
export type Receiver<T> = (result: Result<T>) => void;

/**
 * Requestors are the building blocks of asynchronous logic in Parsec.
 * Requestors are functions which perform "one unit of work". This work is 
 * typically asynchronous, but it can be synchronous. Upon completion, the 
 * requestor should call its {@link Receiver} with a {@link Success} or 
 * {@link Failure}. Requestors may optionally receive a `message` which is a 
 * second argument to the function.
 * Requestors may optionally return a {@link Cancellor}.
 * @template T
 * The type of the `value` parameter in the Result passed to the receiver.
 * @template M
 * The type of the message which can be passed to the requestor. If not 
 * provided, the message can be `any`.
 * @param {Receiver<S>} receiver
 * A callback which is executed with the {@link Result} of the requestor's unit 
 * of work.
 * @param {M} [message]
 * Can be used to configure the requestor call. Can be used in `parsec.sequence` 
 * to allow distributed message passing between `Requestor`s.
 */
export type Requestor<T, M = any> =
    (receiver: Receiver<T>, message?: M) => Cancellor|void;

export interface SequenceSpec {
    timeLimit?: number
}

export interface ParallelSpec<T, M> {
    optionals?: Requestor<T, M>[],
    timeLimit?: number,
    timeOption?: string,
    throttle?: number,
    [__factoryName__]?: string
}

export interface RaceSpec {
    timeLimit?: number,
    throttle?: number,
    [__factoryName__]?: string
}

export interface FallbackSpec {
    timeLimit?: number
}

export interface Parsec {
    sequence: typeof sequence,
    parallel: typeof parallel,
    race: typeof race,
    fallback: typeof fallback
}

/**
 * Contains the core four.
 */
declare const parsec: Parsec;

export default parsec;


declare module "cms-parsec" {
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
     * @template T
     * The type of `value` property in the {@link Result} for the requestor 
     * returned by this factory.
     * @template [M=any]
     * The type of the initial message for the requestor returned by this 
     * factory.
     * @template P 
     * @param {SequenceableRequestors<M, U>} requestors 
     * An array of requestors.
     * @param {object} [spec={}] 
     * Configures sequence.
     * @param {number} [spec.timeLimit] 
     * An time limit, in milliseconds, that the sequence must finish before.
     * @returns {Requestor<U, M>} 
     * The sequence requestor. Upon execution, starts the sequence.
     */
    export function sequence<T, M = any>(
        requestors: [Requestor<any, M>, ...Requestor<any>[], Requestor<T>],
        spec?: SequenceSpec
    ) : Requestor<T, M>;

    /**
     * Creates a requestor which executes multiple requestors concurrently.
     * 
     * @example
     * ```
     * import parsec from "cms-parsec";
     * import { get } from "cms-nebula";
     * 
     * const getBeerAndCheese = parsec.parallel([
     *     get("https://api.com/beer"), 
     *     get("https://api.com/cheese")
     * ]);
     * 
     * // make request
     * getBeerAndCheese(({ value, reason }) => {
     *     if (value === undefined) {
     *         console.log("Failure because", reason);
     *         return;
     *     }
     *     
     *     const [beerResult, cheeseResult] = value;
     *     console.log(
     *         "All beers:\n", 
     *         beerResult,
     *         "\nAll cheeses:\n", 
     *         cheeseResult);
     * });
     * ```
     * 
     * This is not parallelism in the JavaScript. We are giving the server an 
     * opportunity to handle the requests in parallel if it has the capacity to 
     * do so.
     * 
     * The result for each parallelized requestor is stored in an array. If the 
     * requestor created by this factory succeeds, then the receiver response 
     * will contain the array. The order of results corresponds to the order of 
     * the provided requestors.
     * 
     * A throttle can be used if the server can only handle so many simultaneous 
     * requests.
     * 
     * The user can provide a second array of optional requestors. By default, 
     * any optional requestors which have not been executed once every necessary 
     * requestor has completed are not fired; any which have not yet finished 
     * will be canceled if possible. This behavior can be configured with 
     * `spec.timeOption`. See the documentation for {@link TimeOption}.
     * 
     * A time limit can be provided. The requestor returned by `parallel` fails 
     * if the time limit is reached before every necessary requestor completes.
     * 
     * @template T
     * The type of the `value` property in the {@link Result} for each 
     * provided requestor.
     * @template M
     * The type of the message which can be passed to the requestor returned by 
     * this factory.
     * 
     * @param {Requestor[]|ParallelSpec} necessetiesOrSpec 
     * If an array, then the argument is an array of requestors. The requestor 
     * fails if any of these requestors fail. If this argument is an object, 
     * then it replaces the `spec` parameter and any additional arguments will 
     * be ignored.
     * @param {object} [spec] 
     * Configures parallel.
     * @param {Requestor[]} [spec.optionals] 
     * An array of optional requestors. The 
     * requestor still succeeds even if any optionals fail. The `timeOption` 
     * property changes how `parallel` handles optionals if a `timeLimit` is 
     * provided.
     * @param {number} [spec.timeLimit]
     * Optional. A timeout in milliseconds. Failure occurs if the required 
     * requestors are not all complete before this time limit.
     * @param {string} [spec.timeOption]
     * Determines how the optional requestors are handled when the required 
     * requestors are all complete. See the documentation for 
     * {@link TimeOption}.
     * @param {number} [spec.throttle]
     * The number of requestors which can be simultaneously handled by the 
     * server. A throttle of 0 indicates no throttle.
     * @returns {Requestor<T, M>} 
     * Requestor which executes a collection of requestors concurrently.
     */
    export function parallel<T, M = any>(
        necessetiesOrSpec: Requestor<T, M>[],
        spec: ParallelSpec<T, M>
    ) : Requestor<T[], M>;

    /**
     * Runs multiple requestors concurrently but only succeeds with one value.
     * The first requestor to call its receiver in a success state causes that 
     * value to be the result of the requestor returned by this factory.
     * 
     * @example
     * ```
     * import parsec from "cms-parsec";
     * import { get } from "cms-nebula";
     * 
     * const cheeseRequestor = parsec.race([
     *     get("https://cheese.com/api/cheeses/gruyere"), 
     *     get("https://cheese.com/api/cheeses/cheddar"), 
     *     get("https://cheese.com/api/cheeses/american")
     * ]);
     * 
     * // make request
     * cheeseRequestor(({ value, reason }) => {
     *     if (value === undefined) {
     *         console.log("Failure because:", reason);
     *         return;
     *     }
     *     
     *     console.log("Here's the first cheese I found:", value);
     * });
     * ```
     * 
     * There is only failure if every requestor fails.
     * 
     * @template T 
     * The type of the `value` property which can be in the {@link Result} of 
     * any provided {@link Requestor}.
     * @template M 
     * The message which can be passed to the requestor returned by this 
     * factory. Each of the provided requestors will be called with this 
     * message.
     * 
     * @param {import("../../../public-types").Requestor<any, any>[]} requestors 
     * An array of requestors.
     * @param {object} [spec={}] 
     * Configures race.
     * @param {number} [spec.timeLimit]
     * A time limit in milliseconds.
     * @param {number} [spec.throttle]
     * Limits the number of requestors executed in a tick.
     * @returns {import("../../../public-types").Requestor<any, any>} 
     * A requestor. Calling this method starts the race.
     */
    export function race<T, M = any>(
        requestors: Requestor<T, M>[],
        spec: RaceSpec
    ) : Requestor<T, M>;
    
    /**
     * Perform each requestor one at a time until one succeeds.
     *
     * @example
     * ```
     * import parsec from "cms-parsec";
     * import { get } from "cms-nebula";
     * 
     * // I want gruyere, but parmesean will do if they're out
     * const gruyereRequestor_orParmIfWeMust = parsec.fallback([
     *     get("https://cheese.com/api/cheeses/gruyere"), 
     *     get("https://cheese.com/api/cheeses/parmesean")
     * ]);
     * 
     * // make request
     * gruyereRequestor_orParmIfWeMust(({ value, reason }) => {
     *     if (value === undefined) {
     *         console.log("Failure because:", reason);
     *         return;
     *     }
     *     
     *     console.log("Here's the cheese:", value);
     * });
     * ```  
     * 
     * Failure occurs only when all of the provided requestors fail. An optional 
     * time limit can be provided. If so, then failure occurs if the time limit 
     * is reached before any requestor succeeds.
     * 
     * @template T 
     * The type of the `value` property any provided requestor can have in its 
     * result.
     * @template M 
     * The type of message passed to each requestor.
     * 
     * @param {import("../../../public-types").Requestor[]} requestors 
     * An array of requestors.
     * @param {object} [spec={}] 
     * Configures fallback.
     * @param {number} [spec.timeLimit] 
     * An optional time limit.
     * @returns {import("../../../public-types.js").Requestor} 
     * A requestor function. Upon execution, starts the fallback request.
     */
    export function fallback<T, M>(
        requestors: Requestor<T, M>[],
        spec: FallbackSpec
    ) : Requestor<T, M>;
}
