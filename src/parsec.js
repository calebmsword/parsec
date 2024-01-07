import { sequence } from "./factories/sequence/sequence.js"
import { parallel } from "./factories/parallel/parallel.js";
import { race } from "./factories/race/race.js";
import { fallback } from "./factories/fallback/fallback.js";
import { TimeOption } from "./lib/constants.js";

const parsec = Object.freeze({
    sequence,
    parallel,
    fallback,
    race,
    TimeOption
});

export { sequence } from "./factories/sequence/sequence.js";
export { parallel } from "./factories/parallel/parallel.js";
export { race } from "./factories/race/race.js";
export { fallback } from "./factories/fallback/fallback.js";
export { TimeOption } from "./lib/constants.js";

export default parsec;
