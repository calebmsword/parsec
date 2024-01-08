import { sequence } from "./factories/sequence/sequence.js"
import { parallel } from "./factories/parallel/parallel.js";
import { race } from "./factories/race/race.js";
import { fallback } from "./factories/fallback/fallback.js";

/**
 * Contains the four requestor factories in parsec:
 *  - **sequence**: Executes a collection of requestors in order, passing 
 * results from the previous to the next.
 *  - **parallel**: Executes a collection of requestors concurrently.
 *  - **race**: Executes a collection of requestors concurrently. Succeeds with 
 * the value of the first requestor to succeed. 
 *  - **fallback**: Executes a collection of requestors in order, one at a time, 
 * succeeding with the value of the first requestor that succeeds.
 */
const parsec = Object.freeze({

    /**
     * See the documentation for {@link sequence}.
     */
    sequence,
    parallel,
    fallback,
    race
});

export { sequence } from "./factories/sequence/sequence.js";
export { parallel } from "./factories/parallel/parallel.js";
export { race } from "./factories/race/race.js";
export { fallback } from "./factories/fallback/fallback.js";
export { TimeOption } from "./lib/constants.js";

export default parsec;
