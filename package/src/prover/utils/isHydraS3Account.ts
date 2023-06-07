
export const isHydraS3Account = (account: any): boolean => {
    return account.identifier.length === 42
}