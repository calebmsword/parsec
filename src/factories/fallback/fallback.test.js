import assert from "node:assert";
import { describe, test, mock } from "node:test";

import { fallback } from "./fallback.js";

mock.timers.enable(["setTimeout"]);

describe("fallback", () => {
    test("throws if no requestors are provided", () => {
        assert.throws(() => fallback([]));
        // @ts-ignore, intentional wrong type 
        assert.throws(() => fallback());
    });

    test("requestors are executed in order", () => {
        /** @type {number[]} */
        const requestorResults = [];

        fallback([
            receiver => {
                requestorResults.push(1);
                receiver({ reason: "fail" });
            },
            receiver => {
                requestorResults.push(2);
                receiver({ value: "success" });
            }
        ])(_result => {
            assert.deepStrictEqual([1, 2], requestorResults);
        });
        mock.timers.tick(0);
    });
    
    test("the fallback succeeds with the value of first success", () => {
        fallback([
            receiver => receiver({ reason: "fail" }),
            receiver => receiver({ value: "value" })
        ])(({ value }) => {
            assert.strictEqual("value", value);
        });
        mock.timers.tick(0);
    });

    test("the fallback fails only if every requestor fails", () => {
        fallback([
            receiver => receiver({ reason: "fail" }),
            receiver => receiver({ reason: "fail" })
        ])(({ value }) => {
            assert.strictEqual(undefined, value);
        });
        mock.timers.tick(0);
    });

    test("the fallback fails if no successes before timeLimit", () => {
        fallback([
            receiver => {
                setTimeout(() => receiver({ value: "value" }), 100);
            }
        ], {
            timeLimit: 10
        })(({ value }) => {
            assert.strictEqual(undefined, value);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);
    });

    test("can be run in PTC Mode", () => {
        fallback([
            receiver => {
                setTimeout(() => receiver({ reason: "fail" }), 100);
            },
            receiver => {
                receiver({ value: "success" });
            }
        ], {
            ptcMode: true
        })(({ value }) => {
            assert.strictEqual("success", value);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);
    });

    test("eventLoopAdapter can be provided", () => {
        let adapterCalled = false;

        fallback([
            receiver => {
                setTimeout(() => receiver({ reason: "fail" }), 100);
            },
            receiver => {
                receiver({ value: "success" });
            }
        ], {
            eventLoopAdapter: (callback, timeout, ...args) => {
                adapterCalled = true;
                return setTimeout(callback, timeout, ...args);
            }
        })(_result => {
            assert.strictEqual(adapterCalled, true);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);
    });
});
