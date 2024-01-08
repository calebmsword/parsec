import parsec, { TimeOption } from "./src/parsec.js";

import { __factoryName__ } from "./src/lib/constants";

export interface Result {
    value?: any,
    reason?: any
}

export type Cancellor = (reason?: any) => void;

export type Receiver = (result: Result) => void;

export type Requestor = (receiver: Receiver, message?: any) => Cancellor|void;

export interface SequenceSpec {
    timeLimit?: number
}

export interface ParallelSpec {
    optionals?: Requestor[],
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

declare module "cms-parsec" {
    export default parsec;

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
     * @param {import("../../../public-types").Requestor[]} requestors 
     * An array of requestors.
     * @param {object} [spec={}] 
     * Configures sequence.
     * @param {number} [spec.timeLimit] 
     * An time limit, in milliseconds, that the sequence must finish before.
     * @returns {import("../../../public-types").Requestor} 
     * The sequence requestor. Upon execution, starts the sequence.
     */
    export function sequence(
        requestors: Requestor[], 
        spec: SequenceSpec
    ) : Requestor;
    
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
     * @param {import("../../../public-types").Requestor[]|import("../../../public-types").ParallelSpec} necessetiesOrSpec 
     * If an array, then the argument is an array of requestors. The requestor 
     * fails if any of these requestors fail. If this argument is an object, 
     * then it replaces the `spec` parameter and any additional arguments will 
     * be ignored.
     * @param {object} [spec] 
     * Configures parallel.
     * @param {import("../../../public-types").Requestor[]} [spec.optionals] 
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
     * @returns {import("../../../public-types").Requestor} 
     * Requestor which executes a collection of requestors concurrently.
     */
    export function parallel(
        necessetiesOrSpec: Requestor[],
        spec: ParallelSpec
    ) : Requestor;

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
     * @param {import("../../../public-types").Requestor[]} requestors 
     * An array of requestors.
     * @param {object} [spec={}] 
     * Configures race.
     * @param {number} [spec.timeLimit]
     * A time limit in milliseconds.
     * @param {number} [spec.throttle]
     * Limits the number of requestors executed in a tick.
     * @returns {import("../../../public-types").Requestor} 
     * A requestor. Calling this method starts the race.
     */
    export function race(
        requestors: Requestor[],
        spec: RaceSpec
    ) : Requestor;
    
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
     * @param {import("../../../public-types").Requestor[]} requestors 
     * An array of requestors.
     * @param {object} [spec={}] 
     * Configures fallback.
     * @param {number} [spec.timeLimit] 
     * An optional time limit.
     * @returns {import("../../../public-types.js").Requestor} 
     * A requestor function. Upon execution, starts the fallback request.
     */
    export function fallback(
        requestors: Requestor[],
        spec: FallbackSpec
    ) : Requestor;
    
    /**
     * Does this work?
     */
    export { TimeOption };
}
