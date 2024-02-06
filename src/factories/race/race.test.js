import assert from "node:assert";
import { describe, test, mock } from "node:test";

import { race } from "./race.js";
import { __factoryName__ } from "../../lib/constants.js";

mock.timers.enable(["setTimeout"]);

describe("arguments", () => {
    test("a nonempty array of requestors must be provided", () => {
        assert.throws(() => {
            // @ts-ignore, intentionally wrong type
            race([]);
        });

        assert.throws(() => {
            // @ts-ignore, intentionally wrong type
            race([() => {}]);
        });
    });

    test("factoryName can be altered", () => {
        try {
            race([], {
                // @ts-ignore, secret hidden parameter
                [__factoryName__]: "test"
            });
        }
        catch(error) {
            if (error instanceof Error)
                assert.strictEqual(
                    true, error?.message.includes("parsec.test"));
            else throw error;
        }
    });

    test("can be run in PTC Mode", () => {
        race([
            receiver => {
                setTimeout(() => {
                    receiver({ reason: "fail" });
                }, 100);
            },
            receiver => {
                receiver({ value: "success" });
            }
        ], {
            throttle: 1,
            ptcMode: true,
        })(({ value }) => {
            assert.strictEqual("success", value);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);
    });

    test("an eventLoopAdapter can be provided", () => {
        let adapterCalled = false;

        race([receiver => receiver({ value: "success" })], {
            throttle: 1,
            eventLoopAdapter: (callback, timeout, ...args) => {
                adapterCalled = true;
                setTimeout(callback, timeout, ...args);
            },
        })(_result => {
            assert.strictEqual(true, adapterCalled);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);
    });
});

describe("race requestors", () => {
    test("receiver result.value is that of the first requestor to succeed", 
         () => {

        /**
         * @param {any} value 
         * @param {number} t 
         * @returns {import("../../../public-types").Requestor<number>}
         */
        const getRequestor = (value, t) => receiver => {
            setTimeout(() => receiver({ value }), t);
        }

        race([
            getRequestor(1, 1000),
            getRequestor(2, 100),
            getRequestor(3, 10)
        ])(({ value }) => {
            assert.strictEqual(3, value);
        });

        mock.timers.tick(0);
        mock.timers.tick(10);
        mock.timers.tick(100);
        mock.timers.tick(1000);
    });

    test("losers are cancelled once the winner succeeds", () => {
        /** @type {any[]} */
        const cancelledLosers = [];

        /**
         * @param {any} value 
         * @param {number} t 
         * @returns {import("../../../public-types").Requestor<number>}
         */
        const getRequestor = (value, t) => receiver => {
            setTimeout(() => receiver({ value }), t);
            return () => cancelledLosers.push(value);
        }

        race([
            getRequestor(1, 1000),
            getRequestor(2, 100),
            getRequestor(3, 10)
        ])(_result => {
            assert.deepStrictEqual([1, 2], cancelledLosers);
        });

        mock.timers.tick(0);
        mock.timers.tick(10);
        mock.timers.tick(100);
        mock.timers.tick(1000);
    });

    test("failure only occurs if all requestors fail", () => {
        race([
            receiver => receiver({ reason: "fail" }),
            receiver => receiver({ value: "success" })
        ])(({ value }) => {
            assert.notStrictEqual(undefined, value);
        });

        race([
            receiver => receiver({ reason: "fail" })
        ])(({ value }) => {
            assert.strictEqual(undefined, value);
        });

        mock.timers.tick(0);
    });

    test("if timeout occurs, pending requestors are cancelled and the " + 
         "race fails", () => {
            /** @type {number[]} */
        const cancelledLosers = [];

        /**
         * @param {number} value 
         * @param {number} t 
         * @returns {import("../../../public-types").Requestor<number>}
         */
        const getRequestor = (value, t) => receiver => {
            setTimeout(() => receiver({ value }), t);
            return () => cancelledLosers.push(value);
        }

        race([
            getRequestor(1, 100),
            getRequestor(2, 1000)
        ], {
            timeLimit: 10,
        })(({ value }) => {
            assert.strictEqual(undefined, value);
            assert.deepStrictEqual([1, 2], cancelledLosers);
        });

        mock.timers.tick(0);
        mock.timers.tick(10);
        mock.timers.tick(100);
        mock.timers.tick(1000);
    });

    test("if throttled, requestors are called in order", () => {
        let secondReceiverFinishedFirst = true;

        race([
            receiver => {
                setTimeout(() => {
                    secondReceiverFinishedFirst = false;
                    receiver({ reason: "fail" });
                }, 10);
            },
            receiver => receiver({ value: secondReceiverFinishedFirst })
        ], { throttle: 1 })(_result => {
            assert.strictEqual(false, secondReceiverFinishedFirst);
        });
        mock.timers.tick(0);
        mock.timers.tick(10);
    });
});
