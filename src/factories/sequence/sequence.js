import { 
    __factoryName__, 
    FactoryName, 
    TimeOption 
} from "../../lib/constants.js";
import { parallel } from "../parallel/parallel.js";

/**
 * Calls requestors in order, passing results from the previous to the next.
 * @param {import("../../../public-types").Requestor[]} requestors 
 * An array of requestors.
 * @param {object} [spec={}] 
 * Configures sequence.
 * @param {number} [spec.timeLimit] 
 * The optional time limit.
 * @returns {import("../../../public-types").Requestor} 
 * The sequence requestor. Upon execution, starts the sequence.
 */
export function sequence(requestors, spec = {}) {
    const { timeLimit } = spec;

    return parallel(requestors, {
        timeLimit,
        timeOption: TimeOption.SKIP_OPTIONALS_IF_TIME_REMAINS,
        throttle: 1,
        // @ts-ignore, secret undocumented parameter
        [__factoryName__]: FactoryName.SEQUENCE
    });
}
