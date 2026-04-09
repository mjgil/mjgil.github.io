/* tslint:disable */
/* eslint-disable */

export class DiffApp {
    free(): void;
    [Symbol.dispose](): void;
    generate_property_diff(old_text: string, new_text: string, unified: boolean, inline_diff: boolean): string;
    generate_side_by_side_diff(old_text: string, new_text: string): string;
    generate_unified_diff(old_text: string, new_text: string): string;
    constructor();
}

export function main(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_diffapp_free: (a: number, b: number) => void;
    readonly diffapp_generate_property_diff: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly diffapp_generate_side_by_side_diff: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly diffapp_generate_unified_diff: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly diffapp_new: () => number;
    readonly main: () => void;
    readonly wasm_bindgen__closure__destroy__h3df8e5b2fb5d3819: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h05eabf4823b4d06a: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
