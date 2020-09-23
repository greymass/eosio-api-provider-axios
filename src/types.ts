import {AxiosError, AxiosInstance, AxiosRequestConfig} from 'axios'

import AxiosProvider from './index'

export interface AxiosProviderInterceptor {
    provider: AxiosProvider
    onResponse: (response: AxiosRequestConfig) => void
    onError: (error: AxiosError) => void
}

export interface AxiosProviderOptions {
    /**
     * Axios Instance, allowing for override to include custom logic
     */
    axios?: AxiosInstance
    /**
     * Mode of operations for multiple API endpoints
     *  available modes:
     *      failover: will cycle through available endpoints when current node fails
     */
    mode?: string
    /**
     * Custom Interceptor to override behaviour on request/error
     */
    interceptor?: AxiosProviderInterceptor
}

export type UrlType = string | string[]
