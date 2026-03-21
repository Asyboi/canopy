declare module 'madge' {
  interface MadgeResult {
    obj(): Record<string, string[]>;
  }
  interface MadgeOptions {
    fileExtensions?: string[];
    excludeRegExp?: RegExp[];
  }
  function madge(path: string, options?: MadgeOptions): Promise<MadgeResult>;
  export = madge;
}
