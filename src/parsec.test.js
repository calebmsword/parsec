import assert from "node:assert";
import { describe, test } from "node:test";

import parsec, { 
    sequence, 
    parallel, 
    race, 
    fallback, 
    TimeOption 
} from "./parsec.js";

describe("smoke test(s)", () => {
    test("parsec module has expected functions and objects", () => {
        assert.strictEqual(true, typeof sequence === "function");
        assert.strictEqual(true, typeof parallel === "function");
        assert.strictEqual(true, typeof race === "function");
        assert.strictEqual(true, typeof fallback === "function");
        assert.strictEqual(true, typeof TimeOption === "object");
        
        assert.strictEqual(true, Object.isFrozen(parsec));
        assert.strictEqual(true, parsec.hasOwnProperty("sequence"));
        assert.strictEqual(true, parsec.hasOwnProperty("parallel"));
        assert.strictEqual(true, parsec.hasOwnProperty("race"));
        assert.strictEqual(true, parsec.hasOwnProperty("fallback"));
        assert.strictEqual(true, parsec.hasOwnProperty("TimeOption"));
    });
});
