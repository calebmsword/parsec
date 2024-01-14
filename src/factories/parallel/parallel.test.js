import assert, { fail } from "node:assert";
import { describe, test, mock } from "node:test";

import { parallel } from "./parallel.js";
import { FactoryName, TimeOption, __factoryName__ } from "../../lib/constants.js";

mock.timers.enable(["setTimeout"]);

describe("arguments", () => {
    test("first arg must be requestor array or spec object", () => {
        assert.throws(() => {
            // @ts-ignore
            parallel("primitive");
        });

        assert.throws(() => {
            // @ts-ignore
            parallel([{}]);
        });

        assert.throws(() => {
            parallel([
                function invalidRequestor() {},
                // @ts-ignore
                function invalidRequestor(receiver, message, thirdArg) {}
            ]);
        });

        assert.doesNotThrow(() => {
            parallel([
                function validRequestor(receiver) {},
                function validRequestor(receiver, message) {},
            ]);
        });

        assert.doesNotThrow(() => {
            // @ts-ignore
            parallel({});
        });
    });

    test("throws if necessities, optionals and timeOption is not one of the " + 
         "possible values", () => {
        assert.throws(() => {
            parallel([
                function invalidRequestor() {}
            ]);
        });

        assert.throws(() => {
            parallel({
                optionals: [
                    function invalidRequestor() {},
                    // @ts-ignore
                    function invalidRequestor (receiver, message, thirdArg) {}
                ]
            });
        });

        assert.throws(() => {
            parallel([
                function validRequestor(receiver) {},
            ], {
                optionals: [function validRequestor(receiver, message) {}],
                timeOption: "invalid timeOption"
            });
        });
    });

    test("an initialMessage can be provided", () => {
        const initialMessage = "initialMessage";
        const mockRequestor = mock.fn((receiver, message) => {
            receiver({ value: message });
        });

        parallel([mockRequestor])(({ value }) => {}, initialMessage);
        mock.timers.tick(0);

        assert.strictEqual(initialMessage, 
                           mockRequestor.mock.calls[0].arguments[1]);
    });
});

describe("action", () => {
    test("the result only fails if a necessity fails", () => {
        /** @type {import("../../../public-types").Requestor<{}>} */
        const failingRequestor = receiver => receiver({});

        parallel([failingRequestor])(({ value }) => {
            assert.strictEqual(undefined, value);
        });

        parallel({ optionals: [failingRequestor] })(({ value }) => {
            assert.notStrictEqual(undefined, value);
        });

        mock.timers.tick(0);
    });
    
    test("if sequence factory, result contains final requestor value", () => {
        const testValue = "value";

        parallel([
            function(receiver) {
                receiver({ value: testValue });
            }
        ], {
            // @ts-ignore, secret undocumented property of config hash
            [__factoryName__]: FactoryName.SEQUENCE
        })(({ value }) => {
            assert.strictEqual(testValue, value);
        });

        mock.timers.tick(0);
    });
});

describe("necessities, optionals, & timeOption", () => {
    test("necessities are executed first in order, then requestors in " + 
         "order", () => {
        /** @type {number[]} */
        const result = [];

        /**
         * @param {number} n 
         * @returns {import("../../../public-types").Requestor<number>}
         */
        const getRequestor = n => receiver => {
            result.push(n);
            receiver({ value: 0 });
        }

        parallel([
            getRequestor(1),
            getRequestor(2)
        ], {
            optionals: [
                getRequestor(3),
                getRequestor(4)
            ],
            timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
        })(_result => {
            assert.deepStrictEqual([1, 2, 3, 4], result);
        });
        mock.timers.tick(0);
    });

    test("by default, ignore remaining optionals once timeout occurs", () => {
        /** @type {number[]} */
        const result = [];

        /**
         * @param {number} t 
         * @param {number} n 
         * @returns {import("../../../public-types").Requestor<never>} 
         */
        const getDelayedRequestor = (n, t) => receiver => {
            setTimeout(() => result.push(n), t);
        }

        parallel([
            getDelayedRequestor(1, 0),
            getDelayedRequestor(2, 0)
        ], {
            optionals: [
                getDelayedRequestor(3, 100),
                getDelayedRequestor(4, 100)
            ],
            timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS,
            timeLimit: 10
        })(_result => {
            assert.deepStrictEqual([1, 2], result);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);
        mock.timers.tick(1000);
    });
    
    test("if only optionals, then all are tried before timeout occurs", () => {
        /** @type {number[]} */
        const result = [];

        /**
         * @param {number} t 
         * @param {number} n 
         * @returns {import("../../../public-types").Requestor<string>} 
         */
        const getDelayedRequestor = (n, t) => receiver => {
            setTimeout(() => {
                result.push(n);
                receiver({ value: "value" });
            }, t);
        }
        
        parallel({
            optionals: [
                getDelayedRequestor(1, 0),
                getDelayedRequestor(2, 0),
                getDelayedRequestor(3, 300)
            ],
            timeLimit: 100
        })(_result => {
            assert.deepStrictEqual([1, 2], result);
        });
        mock.timers.tick(0);
        mock.timers.tick(300);
    });

    test("pending optionals cancelled if timeLimit reached", () => {
        /** @type {number[]} */
        const result = [];

        /**
         * @param {number} t 
         * @param {number} n 
         * @returns {import("../../../public-types").Requestor<string>} 
         */
        const getDelayedRequestor = (n, t) => receiver => {
            setTimeout(() => receiver({ value: "value" }), t);
            return reason => result.push(n);
        }
        
        parallel({
            optionals: [
                getDelayedRequestor(1, 0),
                getDelayedRequestor(2, 10),
                getDelayedRequestor(3, 1000)
            ],
            timeLimit: 100
        })(_result => {
            assert.deepStrictEqual([3], result);
        });
        mock.timers.tick(0);
        mock.timers.tick(100);    
    });

    test("failure occurs if necessity fails", () => {
        parallel([
            receiver => receiver({ reason: "fail" })
        ])(({ value }) => {
            assert.strictEqual(undefined, value);
        });

        mock.timers.tick(0);
    });

    test("no failure if optional fails", () => {
        parallel([
            receiver => receiver({ value: "success" })
        ], {
            optionals: [receiver => receiver({ reason: "fail" })]
        })(({ value }) => {
            assert.notStrictEqual(undefined, value);
        });
    });

    test("if all necesseties settle and skipping optionals, all pending " + 
         "optionals are cancelled", () => {
            /** @type {number[]} */
        const cancelled = [];

        parallel([
            receiver => receiver({ value: "value" }),
            reciever => { 
                setTimeout(() => reciever({ value: "value" }), 10);
            }
        ], {
            optionals: [
                receiver => {
                    receiver({ value: "value" });
                    return () => cancelled.push(1);
                },
                receiver => {
                    setTimeout(() => receiver({ value: "value" }), 100);
                    return () => cancelled.push(2);
                }
            ]
        })(result => {
            assert.deepStrictEqual([2], cancelled);
        });

        mock.timers.tick(0);
        mock.timers.tick(100);
    });

    test("if require necessities + timeLimit reached, return result " + 
         "immediately if every necessity complete", () => {
            parallel([
                receiver => receiver({ value: "value" })
            ], {
                optionals: [
                    receiver => {
                        setTimeout(() => receiver({ value: "value" }), 1000);
                    }
                ],
                timeOption: TimeOption.REQUIRE_NECESSITIES,
                timeLimit: 10
            })(results => {
                assert.deepStrictEqual([{ value: "value", reason: undefined}], 
                                       results.value);
            });
            mock.timers.tick(0);
            mock.timers.tick(10);
    });

    test("fails if try optionals but time limit reached before necessities " + 
         "finish", () => {
            parallel([
                receiver => {
                    setTimeout(() => receiver({ value: "value" }), 1000);
                }
            ], {
                optionals: [receiver => receiver({ value: "value" })],
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS,
                timeLimit: 10
            })(results => {
                assert.strictEqual(undefined, results.value);
            });
            mock.timers.tick(0);
            mock.timers.tick(10);
            mock.timers.tick(1000);
    });

    test("if require necesseties + timeLimit reached, cancel pending " + 
         "any optionals once necessities finish", () => {
        /** @type {number[]} */
        const cancelled = [];
        
        parallel([
            receiver => receiver({ value: "value" }),
            reciever => { 
                setTimeout(() => reciever({ value: "value" }), 100);
            }
        ], {
            optionals: [
                receiver => {
                    receiver({ value: "value" });
                    return () => cancelled.push(1);
                },
                receiver => {
                    setTimeout(() => receiver({ value: "value" }), 1000);
                    return () => cancelled.push(2);
                }
            ],
            timeOption: TimeOption.REQUIRE_NECESSITIES,
            timeLimit: 10
        })(result => {
            assert.notStrictEqual(undefined, result.value);
            assert.deepStrictEqual([2], cancelled);
        });

        mock.timers.tick(0);  // have `run` call each requestor
        mock.timers.tick(10);  // timeLimit reached
        mock.timers.tick(100);  // second necessity calls receiver, there is an 
                                // optional still pending so parallel cancels it
    });

    test("if timeLimit and try optionals, cancel any pending optionals. " + 
         "success if all necessities passed before timeLimit.", () => {
        /** @type {number[]} */
        const cancelled = [];
        
        parallel([
            receiver => receiver({ value: "value" })
        ], {
            optionals: [
                receiver => {
                    receiver({ value: "value" });
                    return () => cancelled.push(1);
                },
                receiver => {
                    setTimeout(() => receiver({ value: "value" }), 1000);
                    return () => cancelled.push(2);
                }
            ],
            timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS,
            timeLimit: 10
        })(result => {
            assert.notStrictEqual(undefined, result.value);
            assert.deepStrictEqual([2], cancelled);
        });

        mock.timers.tick(0);  // have `run` call each requestor
        mock.timers.tick(10);  // timeLimit reached
    });

    test("if try optionals and timeLimit reached before necessities " + 
         "finish, fail", () => {
        parallel([
            reciever => { 
                setTimeout(() => reciever({ value: "value" }), 100);
            }
        ], {
            timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS,
            timeLimit: 10
        })(result => {
            assert.notStrictEqual(undefined, result.value);
        });

        mock.timers.tick(0);  // have `run` call each requestor
        mock.timers.tick(10);  // timeLimit reached
        mock.timers.tick(100);  // clear queue
    });
});

describe("misc", () => {
    test("result value is array of subresults", () => {
        const value = "value";
        const reason = "reason";
        
        parallel([
            receiver => receiver({ value }),
            receiver => receiver({ value })
        ], {
            optionals: [
                receiver => receiver({ reason })
            ],
            timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
        })(results => {
            assert.deepStrictEqual([
                                    { value, reason: undefined }, 
                                    { value, reason: undefined }, 
                                    { value: undefined, reason }
                                   ], 
                                   results.value);
        });

        mock.timers.tick(0);
    });

    test("reciever called immediately if no requestors", () => {
        parallel([])(({ value }) => {
            assert.deepStrictEqual([], value);
        });
        mock.timers.tick(0);

        parallel({
            // @ts-ignore, undocumented internal parameter
            [__factoryName__]: FactoryName.SEQUENCE,
        })(({ value }) => {
            assert.strictEqual(undefined, value);
        });
        mock.timers.tick(0);
    });

    test("returned factory throws if improper requestor provided", () => {
        assert.throws(() => {
            parallel([])(() => {});
        });
    });

    test("the returned function only executes its receiver once", () => {
        const mockReceiver = mock.fn(_result => {});
        const parallelRequestor = parallel([
            receiver => receiver({ value: "value" })
        ], { timeLimit: 10 });

        parallelRequestor(mockReceiver);
        mock.timers.tick(0);
        mock.timers.tick(10);  // the timeout, if called, would call receiver 
                               // again

        assert.strictEqual(1, mockReceiver.mock.calls.length);
    });

    test("if sequence factory, result is only the last requestor " + 
         "result", () => {
        
        parallel([
            receiver => receiver({ value: "01" }),
            receiver => receiver({ value: "02" })
        ], {
            // @ts-ignore, undocumented secret property
            [__factoryName__]: FactoryName.SEQUENCE,
            throttle: 1
        })(({ value }) => {
            assert.strictEqual("02", value);
        });
        mock.timers.tick(0);
    });

    test("if sequence factory, result is only the last requestor " + 
         "result", () => {
        
        parallel([
            receiver => receiver({ value: "01" }),
            receiver => receiver({ value: "02" })
        ], {
            // @ts-ignore, undocumented secret property
            [__factoryName__]: FactoryName.SEQUENCE,
            throttle: 1
        })(({ value }) => {
            assert.strictEqual("02", value);
        });
        mock.timers.tick(0);
    });

    test("if sequence factory and results.pop returns undefined, result, " + 
         "receiver gets a Failure", () => {
        
        const ArrayDotPop = Array.prototype.pop;

        try {
            Array.prototype.pop = () => undefined;

            parallel([
                receiver => receiver({ value: "01" }),
                receiver => receiver({ value: "02" })
            ], {
                // @ts-ignore, undocumented secret property
                [__factoryName__]: FactoryName.SEQUENCE,
                throttle: 1
            })(({ value, reason }) => {
                Array.prototype.pop = ArrayDotPop;
                assert.strictEqual(undefined, value);
                assert.strictEqual(true, 
                                   reason
                                    .message
                                    .includes("No requestors provided"));
            });
            mock.timers.tick(0);
        }
        catch(error) {
            Array.prototype.pop = ArrayDotPop;
            throw error;
        }
    });

    test("empty arrays and undefined are treated equivalently", async t => {

        await t.test("no necessities, some optionals", () => {
            let emptyArray;
            parallel([], {
                optionals: [receiver => receiver({ value: "value" })],
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                emptyArray = results.value;
            });
            
    
            let undef;
            parallel({
                optionals: [receiver => receiver({ value: "value" })],
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                undef = results.value;
            });
    
            mock.timers.tick(0);
    
            assert.deepStrictEqual(emptyArray, undef);
        });

        await t.test("no necesseties, no optionals", () => {
            let emptyN_emptyO;
            parallel([], {
                optionals: [],
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                emptyN_emptyO = results.value;
            });
            
    
            let emptyN_undefO;
            parallel([], {
                optionals: undefined,
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                emptyN_undefO = results.value;
            });

            let undefN_empty0;
            parallel({
                optionals: [],
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                undefN_empty0 = results.value;
            });

            let undefN_undefO;
            parallel({
                optionals: undefined,
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                undefN_undefO = results.value;
            });
            
            mock.timers.tick(0);
    
            assert.deepStrictEqual(emptyN_emptyO, emptyN_undefO);
            assert.deepStrictEqual(emptyN_undefO, undefN_empty0);
            assert.deepStrictEqual(undefN_empty0, undefN_undefO);
        });

        await t.test("some necesseties, no optionals", () => {
            let emptyArray;
            parallel([receiver => receiver({ value: "value" })], {
                optionals: [],
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                emptyArray = results.value;
            });
            
    
            let undef;
            parallel([receiver => receiver({ value: "value" })], {
                optionals: undefined,
                timeOption: TimeOption.TRY_OPTIONALS_IF_TIME_REMAINS
            })(results => {
                undef = results.value;
            });
    
            mock.timers.tick(0);
    
            assert.deepStrictEqual(emptyArray, undef);
        });
    });
});
