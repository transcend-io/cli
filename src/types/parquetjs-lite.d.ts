declare module 'parquetjs-lite' {
  export interface ParquetCursor {
    /** Returns the next row object or null when exhausted */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next(): Promise<any | null>;
  }

  /**
   * Reader for Parquet files
   */
  export class ParquetReader {
    /** Open a Parquet file from disk */
    static openFile(filePath: string): Promise<ParquetReader>;

    /** Acquire a streaming cursor */
    getCursor(): Promise<ParquetCursor>;

    /** Close underlying resources */
    close(): Promise<void>;

    /** Schema metadata (parquetjs-lite keeps fields on `schema.schema`) */
    schema:
      | {
          /** Schema */
          schema?: Record<string, unknown>;
        }
      | undefined;
  }
}
