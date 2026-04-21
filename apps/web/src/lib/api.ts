import { BrowserTokenStore, HugeEdgeClient } from "@hugeedge/api-client";
import { getWebConfig } from "@hugeedge/config";

export const tokenStore = new BrowserTokenStore();
export const api = new HugeEdgeClient(getWebConfig().apiBaseUrl, tokenStore);
