
export const useGTag = (...args: any[]) =>
    (...args: any) => {
        // @ts-ignore
        window["dataLayer"] = window["dataLayer"] || []
        // @ts-ignore
        window['dataLayer'].push(...args);
    }
