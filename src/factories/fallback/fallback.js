import { FactoryName, __factoryName__ } from "../../lib/constants.js";
import { race } from "../race/race.js";

/**
 * Perform each requestor one at a time until one succeeds.
 *
 * @example
 * ```
 * import parsec from "./parsec";
 * import { createFetchRequestor } from "./example-utils";
 * 
 * const gruyereRequestor = createFetchRequestor("https://cheese.com/api/cheeses/gruyere");
 * const parmeseanRequestor = createFetchRequestor("https://cheese.com/api/cheeses/parmesean");
 * 
 * // I want gruyere, but parmesean will do if they're out
 * const gruyereRequestor_orParmIfWeMust = parsec.fallback({
 *     requestors: [gruyereRequestor, parmeseanRequestor]
 * });
 * 
 * // make request
 * gruyereRequestor_orParmIfWeMust(({ value, reason }) => {
 *     if (value === undefined) {
 *         console.log("In error state! " + reason ? `Because: ${reason}` : "");
 *         return;
 *     }
 *     
 *     console.log("Here's the cheese:", value);
 * });
 * ```  
 * 
 * Failure occurs only when all of the provided requestors fail. An optional 
 * time limit can be provided. If so, then failure occurs if the time limit is 
 * reached before any requestor succeeds.
 * @param {import("../../../public-types").Requestor<any, any>[]} requestors 
 * An array of requestors.
 * @param {object} [spec={}] 
 * Configures fallback.
 * @param {number} [spec.timeLimit] 
 * An optional time limit.
 * @returns {import("../../../public-types.js").Requestor<any, any>} 
 * A requestor function. Upon execution, starts the fallback 
 * request.
 */
export function fallback(requestors, spec = {}) {
    const {
        timeLimit
    } = spec;
    return race(requestors, {
        timeLimit,
        throttle: 1,
        // @ts-ignore, secret hidden parameter
        [__factoryName__]: FactoryName.FALLBACK
    });
}
