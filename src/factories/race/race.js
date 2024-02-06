import { FactoryName, __factoryName__ } from "../../lib/constants.js";
import {
    checkRequestors, 
    checkReceiver, 
    makeReason 
} from "../../lib/utils/utils.js";
import { run } from "../../lib/run/run.js";

/**
 * Creates a requestor which succeeds when any of its requestors succeeds.
 * There is only failure if every requestor fails.
 * 
 * @template T 
 * 
 * @template M
 * 
 * @param {import("../../../public-types").Requestor<T, M>[]} requestors 
 * An array of requestors.
 * @param {object} [spec={}] 
 * Configures race.
 * @param {number} [spec.timeLimit]
 * A time limit in milliseconds.
 * @param {number} [spec.throttle]
 * Limits the number of requestors executed in a tick.
 * @param {import("../../../public-types").SetTimeoutLike} [spec.eventLoopAdapter]
 * See {@link run}.
 * @param {boolean} [spec.ptcMode = false]
 * See {@link run}.
 * @returns {import("../../../public-types").Requestor<T, M>} 
 * A requestor. Calling this method starts the race.
 */
export function race(requestors, spec = {}) {
    const {
        timeLimit,
        throttle,
        eventLoopAdapter,
        ptcMode = false
    } = spec;

    /** @type {import("../../../public-types.js").RaceSpec} */
    const raceSpec = spec;

    // `spec[__factoryName__]` can be something other than `FactoryName.RACE` 
    // because other factories use `race` in their logic. This is an internal 
    // option that the user should not use, hence it not mentioned in the public 
    // documentation `race`.
    const factoryName = raceSpec[__factoryName__] || FactoryName.RACE;

    if (requestors === undefined || requestors.length === 0) throw makeReason({
        factoryName,
        excuse: "No requestors provided!"
    });

    checkRequestors(requestors, factoryName);

    return function raceRequestor(receiver, initialMessage) {
        checkReceiver(receiver, factoryName);

        let numberPending = requestors.length;

        let cancel = run({
            factoryName,
            requestors,
            initialMessage,
            action({ value, reason, requestorIndex }) {
                numberPending--;
                
                if (value !== undefined) {
                    // We have a winner. Cancel the losers
                    cancel(makeReason({
                        factoryName,
                        excuse: "Cancelling loser!",
                        evidence: requestorIndex
                    }));
                    receiver({ value, reason });
                }
                else if (numberPending < 1) {
                    // Nothing succeeded. This is now a failure
                    cancel(reason);
                    receiver({ reason });
                }
            },
            timeout() {
                const reason = makeReason({
                    factoryName,
                    excuse: "Timeout occured!",
                    evidence: timeLimit
                });
                cancel(reason);
                receiver({ reason });
            },
            timeLimit,
            throttle,
            eventLoopAdapter,
            ptcMode
        });
        return cancel;
    };
}
