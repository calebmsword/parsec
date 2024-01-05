export const FactoryName = Object.freeze({
    SEQUENCE: "sequence",
    PARALLEL: "parallel",
    FALLBACK: "fallback",
    RACE: "race"
});

/**
 * Determines how the optional requestors are handled in `parallel`.
 * There are three keys in TimeOption:
 * 
 *  - `"SKIP_OPTIONALS_IF_TIME_REMAINS"`: The optionals must finish before the 
 * necessities. The necessities must finish before the time limit if it is 
 * given.
 *  - `"TRY_OPTIONALS_IF_TIME_REMAINS"`: If the necessities finish and there are 
 * still some optionals left, keep doing optionals until the time limit is 
 * reached.
 *  - `"REQUIRE_NECESSITIES"`: The necesseties have no time limit, but the 
 * optionals do. If the necessities finish and there are optionals remaining, 
 * keep going if there is time left.
 */
export const TimeOption = Object.freeze({
    SKIP_OPTIONALS_IF_TIME_REMAINS: "skip opts",
    TRY_OPTIONALS_IF_TIME_REMAINS: "try opts",
    REQUIRE_NECESSITIES: "require necessities"
});

export const allTimeOptions = Object.freeze(Object.keys(TimeOption));

export const __factoryName__ = Symbol("factoryName");
