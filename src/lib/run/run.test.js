import assert from "node:assert";
import { describe, test, mock } from "node:test";

import { run } from "./run.js";
import { FactoryName } from "../constants.js";

mock.timers.enable(["setTimeout"]);

// mock.timers.tick

describe("run arguments", () => {
    test("if no requestors are provided, only timeout occurs", () => {
        const timeout = mock.fn();

        run({
            factoryName: "test",
            requestors: [],
            action: () => {},
            timeout,
            timeLimit: 0
        });
        mock.timers.tick(0);

        assert.strictEqual(1, timeout.mock.calls.length);
    });

    test("if no requestors + no timeout, nothing happens", () => {
        const action = mock.fn();

        run({
            factoryName: "test",
            requestors: [],
            action
        });
        mock.timers.tick(1000);

        assert.strictEqual(0, action.mock.calls.length);
    });
    
    test("throws if action is not callable", () => {
        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [receiver => receiver({ value: "value" })],
                // @ts-ignore, we are intentionally providing the wrong type
                action: "not callable"
            });
            mock.timers.tick(0);
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [receiver => receiver({ value: "value" })],
                // @ts-ignore, we are intentionally providing the wrong type
                action: Function.prototype
            });
            mock.timers.tick(0);
        });
    });

    test("throws if timeLimit is not a positive number", () => {
        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                timeLimit: 0
            });
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                timeLimit: -100
            });
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                timeLimit: "not a number"
            });
        });
    });

    test("throws if timeout is not a function", () => {
        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                timeout: "not callable",
                timeLimit: 0
            });
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                timeout: Function.prototype,
                timeLimit: 0
            });
        });
    });

    test("throws if throttle is not a non-negative safe integer", () => {
        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                throttle: "not a number"
            });
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                throttle: -1
            });
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                throttle: 1.1
            });
        });

        assert.throws(() => {
            run({
                factoryName: "test",
                requestors: [],
                action: () => {},
                // @ts-ignore, we are intentionally providing the wrong type
                throttle: Number.MAX_SAFE_INTEGER + 1
            });
        });
    });
});

describe("requestors", () => {
    test("all requestors are executed", () => {
        const requestorStore = [];

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor01 = receiver => {
            requestorStore.push(0);
        }

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor02 = receiver => {
            requestorStore.push(0);
        }

        run({
            factoryName: "test",
            requestors: [requestor01, requestor02],
            action: () => {}
        });
        mock.timers.tick(0);

        assert.strictEqual(2, requestorStore.length);
    });

    test("requestor cannot have their receivers called more than once", () => {
        const action = mock.fn();

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor = receiver => {
            receiver({ value: "value" });
            receiver({ value: "value" });
        }

        run({
            factoryName: "test",
            requestors: [requestor],
            action
        });
        mock.timers.tick(0);

        assert.strictEqual(1, action.mock.calls.length);
    });

    test("requestor called => receiver queued => run cancelled, then no receiver called", () => {
        const action = mock.fn();

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor = receiver => {
            setTimeout(() => receiver({ value: "value" }), 1);
        }

        const cancellor = run({
            factoryName: "test",
            requestors: [requestor],
            action
        });
        mock.timers.tick(0);
        cancellor();
        mock.timers.tick(1);

        assert.strictEqual(0, action.mock.calls.length);
    });

    test("requestors get the same message by default", () => {
        /** @type {string[]} */
        const messageStore = [];

        const getRequestor = () => 
            /** @type {import("../../../public-types.js").Requestor} */
            (receiver, message) => {
                messageStore.push(message);
            }
        
        const initialMessage = "message";
        
        run({
            factoryName: "test",
            requestors: [getRequestor(), getRequestor()],
            action: () => {},
            initialMessage
        });
        mock.timers.tick(0);

        assert.deepStrictEqual([initialMessage, initialMessage], messageStore);
    });

    test("message passing if sequence factoryName and throttle === 1", () => {
        /** @type {string[]} */
        const messageStore = [];

        const initialMessage = "message01";
        const secondMessage = "message02";

        const getRequestor = () => 
            /** @type {import("../../../public-types.js").Requestor} */
            (receiver, message) => {
                messageStore.push(message)
                receiver({ value: secondMessage });
            }
        
        run({
            factoryName: FactoryName.SEQUENCE,
            requestors: [getRequestor(), getRequestor()],
            action: () => {},
            throttle: 1,
            initialMessage
        });
        mock.timers.tick(0);

        assert.deepStrictEqual([initialMessage, secondMessage], messageStore);
    });
});

describe("action", () => {
    test("action is called for each requestor", () => {
        const action = mock.fn();

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor = receiver => receiver({ value: "value" });

        run({
            factoryName: "test",
            requestors: [requestor, requestor],
            action
        });
        mock.timers.tick(0);

        assert.strictEqual(2, action.mock.calls.length);
    });

    test("action is called without value if error occurs", () => {
        const action = mock.fn();

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor = receiver => {
            throw new Error("error");
        };

        run({
            factoryName: "test",
            requestors: [requestor],
            action
        });
        mock.timers.tick(0);

        assert.strictEqual(1, action.mock.calls.length);
        assert.strictEqual(undefined, action.mock.calls[0].arguments[0].value);
    });
});

describe("cancellor", () => {
    test("receives a default reason if none provided", () => {
        /** @type {import("../../../private-types.js").Reason[]} */
        const reasonStore = [];

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor = receiver => {
            setTimeout(() => receiver({ value: "value" }), 1);
            return reason => reasonStore.push(reason);
        };

        const cancellor = run({
            factoryName: "test",
            requestors: [requestor],
            action: () => {}
        });
        mock.timers.tick(0);  // allow queued requestor to be run
        cancellor();  // cancel before requestor schedules receiver

        assert.deepStrictEqual(1, reasonStore.length);
        assert.strictEqual(true, reasonStore[0].message.includes("Cancel!"));
    });

    test("stops unlaunched requestors from starting", () => {
        /** @type {number[]} */
        const requestorStore = [];

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor = receiver => {
            requestorStore.push(0);
            receiver({ value: 0 });
        };

        const cancellor = run({
            factoryName: "test",
            requestors: [requestor],
            action: () => {}
        });
        cancellor();  // cancel before requestor does anything
        mock.timers.tick(0);  // requestor will do something if allowed

        assert.strictEqual(0, requestorStore.length);
    });

    test("calls every existing cancellor for each unfinished requestor", t => {
        /** @type {import("../../../private-types.js").Reason[]} */
        const reasonStore = [];
        
        /** @type {import("../../../public-types.js").Requestor} */
        const requestor01 = receiver => {
            receiver({ value: "value" });
            return reason => reasonStore.push(reason);
        };

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor02 = receiver => {
            setTimeout(() => receiver({ value: "value" }), 1);
            return reason => reasonStore.push(reason);
        };

        const cancellor = run({
            factoryName: "test",
            requestors: [requestor01, requestor02],
            action: () => {}
        });
        
        mock.timers.tick(0);  // requestor01 will launch
        cancellor();  // cancel before requestor02 calls receiver
        mock.timers.tick(1);  // requestor02 would launch now

        assert.strictEqual(1, reasonStore.length);
    });

    test("cancels the provided timeout if one is provided", () => {
        const timeout = mock.fn();

        const cancellor = run({
            factoryName: "test",
            requestors: [],
            action: () => {},
            timeout,
            timeLimit: 0
        });
        cancellor();
        mock.timers.tick(0);  // timeout will go if it can

        assert.strictEqual(0, timeout.mock.calls.length);
    });

    test("no throw if non-function cancellors or errors in cancellor", () => {
        /** @type {import("../../../public-types.js").Requestor} */
        const requestor01 = receiver => {
            // @ts-ignore, we are intentionally providing the wrong type
            return "not a function";
        }

        /** @type {import("../../../public-types.js").Requestor} */
        const requestor02 = receiver => {
            return reason => {
                throw new Error("error");
            }
        }
        
        const cancellor = run({
            factoryName: "test",
            requestors: [requestor01, requestor02],
            action: () => {}
        });
        
        assert.doesNotThrow(() => {
            mock.timers.tick(0);
            cancellor();
        });
    });
});
