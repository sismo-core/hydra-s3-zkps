
export const isSourceHydraS3Account = (source: any): boolean => {
    return source && source?.commitmentReceipt !== undefined;
}