import {
    checkRequestors, 
    checkReceiver,
    makeReason
} from "../../lib/utils/utils.js";
import { 
    __factoryName__, 
    FactoryName, 
    TimeOption,
    allTimeOptions
} from "../../lib/constants.js";
import { run } from "../../lib/run/run.js";

/**
 * Creates a requestor which executes multiple requestors concurrently.
 * 
 * @example
 * ```
 * import parsec from "./parsec";
 * import { createFetchRequestor } from "./example-utils";
 * 
 * const cheeseRequestor = createFetchRequestor("https://cheese.com/api/cheeses");
 * const beerRequestor = createFetchRequestor("https://beer.com/api/beers");
 * 
 * const cheeseAndBeerRequestor = parsec.parallel(
 *     [cheeseRequestor, beerRequestor]
 * );
 * 
 * // make request
 * cheeseAndBeerRequestor(({ value, reason }) => {
 *     if (value === undefined) {
 *         console.log("Failure because", reason);
 *         return;
 *     }
 *     
 *     const [cheeseResult, beerResult] = value;
 *     console.log("All cheeses:", cheeseResult, "All beers:", beerResult);
 * });
 * ```
 * 
 * The result for each parallelized requestor is stored in an array. If the 
 * requestor created by this factory succeeds, then the receiver response will 
 * contain the array.
 * 
 * This is not parallelism in the JavaScript. We are giving the server (or 
 * whatever the recepient of the requestor may be) an opportunity to handle the 
 * requests in parallel if it has the capacity to do so.
 * 
 * A throttle can be used if the server can only handle so many simultaneous 
 * requests.
 * 
 * The user can provide a second array of optional requestors. By default, any 
 * optional requestors which have not been executed once every necessary 
 * requestor has completed are not fired; any which have not yet finished will 
 * be canceled if possible. This behavior can be configured with 
 * `spec.timeOption`. See the documentation for the `TimeOption` object.
 * 
 * A time limit can be provided. The requestor returned by `parallel` fails if 
 * the time limit is reached before every necessary requestor completes.
 * 
 * @param {import("../../../public-types").Requestor[]|import("../../../public-types").ParallelSpec} necessetiesOrSpec 
 * If an array, then the argument is an array of requestors. The requestor fails if any of these requestors fail. If 
 * this argument is an object, then it replaces the `spec` parameter and any 
 * additional arguments will be ignored.
 * @param {object} [spec] 
 * Configures parallel.
 * @param {import("../../../public-types").Requestor[]} [spec.optionals] 
 * An array of optional requestors. The 
 * requestor still succeeds even if any optionals fail. The `timeOption` 
 * property changes how `parallel` handles optionals if a `timeLimit` is 
 * provided.
 * @param {number} [spec.timeLimit]
 * Optional. A timeout in milliseconds. Failure 
 * occurs if the required requestors are not all complete before this time limit.
 * @param {string} [spec.timeOption]
 *  Determines how the optional requestors are 
 * handled when the required requestors are all complete. See the documentation 
 * for the `TimeOption` object.
 * @param {number} [spec.throttle]
 * The number of requestors which can be 
 * simultaneously handled by the server. A throttle of 0 indicates no throttle.
 * @returns {import("../../../public-types").Requestor} 
 * Requestor which calls the array of requestors in 
 * "parallel".
 */
export function parallel(necessetiesOrSpec, spec = {}) {
    /** @type {import("../../../public-types.js").Requestor[]} */
    let necessities = [];

    if (
        !Array.isArray(necessetiesOrSpec)
        && typeof necessetiesOrSpec === "object"
    )
        spec = necessetiesOrSpec;
    else if (Array.isArray(necessetiesOrSpec))
        necessities = necessetiesOrSpec;
    else
        throw makeReason({
            factoryName: FactoryName.PARALLEL,
            excuse: "`necessetiesOrSpec must be an array of requestors or a " +
                    "`ParallelSpec` object",
            evidence: necessetiesOrSpec
        });

    /** @type {import("../../../public-types").ParallelSpec} */
    const parallelSpec = spec;

    const {
        optionals,
        timeLimit,
        throttle,
    } = parallelSpec

    // `spec[__factoryName__]` can be something other than 
    // `FactoryName.PARALLEL` because other factories use `parallel` in their 
    // logic. This is an internal option that the user should not use, hence it 
    // not mentioned in the public documentation for parallel. 
    const factoryName = parallelSpec[__factoryName__] || FactoryName.PARALLEL;

    let { 
        timeOption = TimeOption.SKIP_OPTIONALS_IF_TIME_REMAINS 
    } = spec;

    /** @type {import("../../../public-types.js").Requestor[]} */
    let requestors;

    /** @type {number} */
    let numberOfNecessities;

    if (necessities.length === 0) {
        if (optionals === undefined || optionals.length === 0)
            requestors = [];
        else {
            requestors = optionals;
            timeOption = TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS;
        }
    }
    else {
        if (optionals === undefined || optionals.length === 0) {
            // some necesseties and no optionals
            requestors = necessities;
            timeOption = TimeOption.SKIP_OPTIONALS_IF_TIME_REMAINS;
        }
        else {
            // some necesseties and some optionals
            requestors = [...necessities, ...optionals];

            // ensure the provided timeOption is one of those contained
            // in the TimeOption object
            if (!allTimeOptions.some(option => option === timeOption))
                throw makeReason({
                    factoryName,
                    excuse: "timeOption must be one of: " + 
                            allTimeOptions.join(", "),
                    evidence: timeOption
                });
        }
    }

    checkRequestors(requestors, factoryName);
    numberOfNecessities = necessities.length;

    /** @type {import("../../../public-types").Requestor} */
    return function parallelRequestor(receiver, initialMessage) {
        checkReceiver(receiver, factoryName);

        let numberPending = requestors.length;
        let numberPendingNecessities = numberOfNecessities;

        /** @type {any[]} */
        const results = [];

        if (numberPending === 0) {
            receiver(
                factoryName === FactoryName.SEQUENCE 
                ? { value: initialMessage } 
                : { value: results }
            );
            return;
        }

        // Get the cancel function from the `run` helper.
        // We don't just immediately return the value of this function because 
        // we need the returned cancel function to be in scope since `action`  
        // uses it. (`action` is called asynchronously, so `cancel` is defined 
        // by the time action uses it.)
        const cancel = run({
            factoryName,
            requestors,
            initialMessage,
            action({ value, reason, requestorIndex }) {

                results[requestorIndex] = { value, reason }

                numberPending--;
                
                // The necessities are encountered first. Notice we only enter 
                // failure state if a necessity fails.
                if (requestorIndex < numberOfNecessities) {
                    numberPendingNecessities--;
                    
                    if (value === undefined) {
                        cancel(reason);

                        receiver({ reason });
                        return;
                    }
                }

                // If nothing is pending, or all necessities are handled and 
                // we have a time option which ignores optionals, then finish.
                if (numberPending < 1 || 
                    (
                        timeOption === TimeOption.SKIP_OPTIONALS_IF_TIME_REMAINS
                        && numberPendingNecessities < 1
                    )
                ) {
                    cancel(makeReason({
                        factoryName,
                        excuse: "All necessities are complete, optional " + 
                                "requestors are being canceled"
                    }));
                    receiver(
                        factoryName === FactoryName.SEQUENCE 
                            ? results.pop() 
                            : { value: results, reason }
                    );
                }

            },
            timeout() {
                const reason = makeReason({
                    factoryName,
                    excuse: "Time limit reached!",
                    evidence: timeLimit
                });

                if (timeOption === TimeOption.REQUIRE_NECESSITIES) {
                    timeOption = TimeOption.SKIP_OPTIONALS_IF_TIME_REMAINS;
                    if (numberPendingNecessities < 1) {
                        cancel(reason);
                        receiver({ value: results, reason });
                    }
                }
                else if (
                    timeOption === TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
                ) {
                    cancel(reason);

                    if (numberPendingNecessities < 1) {
                        receiver({ value: results });
                    }
                    // We failed if some necessities weren't handled in time
                    else {
                        receiver({ reason });
                    }
                }
            },
            timeLimit,
            throttle
        });

        return cancel;
    }
}
