import assert from "node:assert";
import { describe, test } from "node:test";

import {
    isFunction, 
    makeReason,
    checkReceiver,
    checkRequestors
} from "./utils.js";

/**
 * Returns the type of the given value.
 * @param {any} value 
 * @returns {string}
 */
const getTypeof = value => value === null ? "null" : typeof value; 

describe("isFunction", () => {
    test("correctly identifies functions", async t => {
        /** @type {Array<[Function, string]>} */
        const functions = [
            [() => {}, "arrow function syntax"], 
            [function() {}, "normal function syntax"]
        ];

        for (let i = 0; i < functions.length; i++) {
            const [func, testDescription] = functions[i];

            await t.test(testDescription, () => {
                assert.strictEqual(true, isFunction(func));
            });
        }
    });

    test("does not falsely identify functions", async t => {
        const values = [
            true, 
            0, 
            "", 
            {}, 
            undefined, 
            null, 
            Symbol("0"), 
            BigInt(0),
            Function.prototype
        ];
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i];

            const testDescription = value === Function.prototype
                ? "Function.prototype"
                : `typeof ${getTypeof(value)}`;

            await t.test(testDescription, () => {
                assert.strictEqual(false, isFunction(value));
            });
        }
    });
});

describe("makeReason", () => {
    test("creates an error object", () => {
        const reason = makeReason({ factoryName: "test" });

        assert.strictEqual(reason instanceof Error, true);
    });

    test("creates expected error message", () => {
        const reasonNoExcuse = makeReason({ factoryName: "test" });
        const reasonWithExcuse = makeReason({
            factoryName: "test",
            excuse: "reason"
        });

        assert.strictEqual("parsec.test", reasonNoExcuse.message);
        assert.strictEqual("parsec.test: reason", reasonWithExcuse.message);
    });

    test("optionally provides evidence", () => {
        const reason  = makeReason({ factoryName: "test" });
        const reasonWithEvidence = makeReason({
            factoryName: "test",
            evidence: "evidence"
        });

        assert.strictEqual(false, reason.hasOwnProperty("evidence"));
        assert.strictEqual("evidence", reasonWithEvidence.evidence);
    });
});

describe("checkReceiver", () => {
    test("a proper receiver does not throw", () => {
        /** @type {import("../../../public-types.js").Receiver} */
        const receiver = ({ value, reason }) => console.log(value, reason);

        checkReceiver(receiver, "test");
    });

    test("improper arguments number throws", async t => {
        const functions = [
            /** @type {(...args: any) => void} */
            (_one, _two) => {},
            () => {}
        ];

        for (let i = 0; i < functions.length; i++) {
            const func = functions[i];

            const testDescription = `${func.length} arguements`;

            await t.test(testDescription, () => {
                // @ts-ignore, we are intentionally providing wrong type
                assert.throws(() => checkReceiver(func, "test"));
            });
        }
    });

    test("improper types throws", async t => {
        const values = [
            null,
            undefined,
            "",
            0,
            true,
            Symbol(0),
            BigInt(0),
            {}
        ];
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i]
            
            const testDescription = getTypeof(value);
            
            await t.test(testDescription, () => {
                // @ts-ignore, we are intentionally providing wrong type
                assert.throws(() => checkReceiver(value, "test"));
            });
        }
    });
});

describe("checkRequestors", () => {
    test("array of proper requestors is does not throw", () => {
        /** @type {import("../../../public-types.js").Requestor[]} */
        const requestors = [
            receiver => console.log(receiver),
            (receiver, message) => console.log(receiver, message)
        ];

        assert.doesNotThrow(() => checkRequestors(requestors, "test"));
    });

    test("must provide an array or it throws", async t => {
        const values = [
            {},
            undefined,
            null,
            0,
            "",
            true,
            Symbol(0),
            BigInt(0)
        ];
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i]
            
            const testDescription = getTypeof(value);;
            
            await t.test(testDescription, () => {
                // @ts-ignore, we are intentionally providing wrong type
                assert.throws(() => checkRequestors(value, "test"));
            });
        }
    });

    test("requestors must be functions", async t => {
        const EMPTY_ARRAY = Symbol("EMPTY_ARRAY");

        const values = [
            EMPTY_ARRAY,
            {},
            undefined,
            null,
            0,
            "",
            true,
            Symbol(0),
            BigInt(0)
        ];
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i]
            
            const testDescription = value === EMPTY_ARRAY
                ? "empty array"
                : getTypeof(value);
            
            await t.test(testDescription, () => {
                const badRequestor = value === EMPTY_ARRAY
                    ? []
                    : value;

                // @ts-ignore, we are intentionally providing wrong type
                assert.throws(() => checkRequestors([badRequestor], "test"));
            });
        }
    });

    test("requestors must take one or two arguments", async t => {
        const values = [
            () => {},
            /** @type {(...args: any) => void} */
            (_one, _two, _three) => {}
        ];
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i]
            
            const testDescription = `${value.length} arguments throws`;
            
            await t.test(testDescription, () => {
                // @ts-ignore, we are intentionally providing wrong type
                assert.throws(() => checkRequestors([value], "test"));
            });
        }
    });
});
