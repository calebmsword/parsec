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
 *  - `"SKIP_OPTIONALS_IF_TIME_REMAINS"`: Any optionals which have not yet 
 * finished by the time the required requestors finish are discarded. The 
 * required requestors must finish before the time limit, if there is one.
 *  - `"TRY_OPTIONALS_IF_TIME_REMAINS"`: The required requestors and the 
 * optional requestors must all finish before the time limit.
 *  - `"REQUIRE_NECESSITIES"`: The required requestors have no time limit. The 
 * optional requestors must finish before the required finish and the time 
 * limit, whichever is later.
 */
export const TimeOption = Object.freeze({
    SKIP_OPTIONALS_IF_TIME_REMAINS: "SKIP_OPTIONALS_IF_TIME_REMAINS",
    TRY_OPTIONALS_IF_TIME_REMAINS: "TRY_OPTIONALS_IF_TIME_REMAINS",
    REQUIRE_NECESSITIES: "REQUIRE_NECESSITIES"
});

export const allTimeOptions = Object.freeze(Object.values(TimeOption));

export const __factoryName__ = Symbol("factoryName");
