/**
 * Returns true if the candidate is a function, false otherwise.
 * @param {any} candidate 
 * @returns {boolean}
 */
export function isFunction(candidate) {
    return typeof candidate === "function" && candidate !== Function.prototype;
}

/**
 * Creates a "reason" object which is used for error handling.
 * The reason object contains all properties found in objects created from the 
 * `Error` function constructor as well as an optional `evidence` property. The 
 * `evidence` property can be whatever the caller of this method needs it to be.
 * @param {object} spec Configures the reason
 * @param {string} [spec.factoryName]
 * @param {string|undefined} [spec.excuse] 
 * @param {any} [spec.evidence]
 * @returns {import("../../../private-types").Reason}
 */
export function makeReason(spec) {
    const { factoryName, excuse, evidence } = spec;

    const excuseText = excuse === undefined ? "" : `: ${excuse}`;
    const error = new Error(`parsec.${factoryName}${excuseText}`);
    
    return Object.assign(error, evidence === undefined ? {} : { evidence });
}

/**
 * Throws if the provided callback is not a proper receiver.
 * @param {import("../../../public-types").Receiver} receiver 
 * @param {string} factoryName 
 * @returns {void} 
 */
export function checkReceiver(receiver, factoryName) {
    if (!isFunction(receiver) || receiver.length !== 1) throw makeReason({
        factoryName,
        excuse: "A receiver must be a function of one argument!",
        evidence: receiver
    });
}

/**
 * Checks if provided value is an array of proper requestors.
 * @param {import("../../../public-types").Requestor[]} requestors 
 * @param {String} factoryName 
 */
export function checkRequestors(requestors, factoryName) {
    if (requestors.some(requestor => !isFunction(requestor) 
                                     || requestor.length < 1
                                     || requestor.length > 2))
        throw makeReason({
            factoryName: factoryName,
            excuse: "Requestors must be functions of 1 or 2 arguments!",
            evidence: requestors
        });
}
