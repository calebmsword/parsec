import assert from "node:assert";
import { describe, test, mock } from "node:test";

import { sequence } from "./sequence.js";

mock.timers.enable(["setTimeout"]);

describe("sequence", () => {
    test("requestors are executed in order", () => {
        /** @type {number[]} */
        const requestorResults = [];

        sequence([
            receiver => {
                requestorResults.push(1);
                receiver({ value: "success" });
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

    test("success if every requestor succeeds", () => {
        sequence([
            receiver => receiver({ value: "success" }),
            receiver => receiver({ value: "success" })
        ])(({ value }) => {
            assert.notStrictEqual(undefined, value);
        });
        mock.timers.tick(0);
    });

    test("failure if any requestor fails", () => {
        sequence([
            receiver => receiver({ value: "success" }),
            receiver => receiver({ reason: "fail" })
        ])(({ value }) => {
            assert.strictEqual(undefined, value);
        });
        mock.timers.tick(0);
    });

    test("messages are passed from one requestor to the next", () => {
        /** @type {string[]} */
        const messages = [];

        sequence([
            (receiver, message) => {
                messages.push(message);
                receiver({ value: 1 });
            },
            (receiver, message) => {
                messages.push(message);
                receiver({ value: 2 });
            },
        ])(_result => {
            assert.deepStrictEqual([0, 1], messages);
        }, 0);
        mock.timers.tick(0);
    });
});
