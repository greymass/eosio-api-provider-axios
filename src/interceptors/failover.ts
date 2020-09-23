import {AxiosError, AxiosRequestConfig} from 'axios'

import {AxiosProvider} from '../index'
import {AxiosProviderInterceptor} from '../types'

export default class AxiosProviderModeFailover implements AxiosProviderInterceptor {
    provider: AxiosProvider

    constructor(provider) {
        this.provider = provider
    }

    onResponse = (
        response: AxiosRequestConfig
    ) => response

    onError = (
        error: AxiosError
    ) => {
        try {
            // If a connection pool exists, attempt retry
            if (this.provider.getPool().length) {
                const retry = this.attemptRetry(error.config)
                if (retry) {
                    return retry
                }
            }
            // if the pool is empty or exhausted, return the error response if it exists
            if (error.response) {
                return error.response
            }
            // otherwise return the error code
            return {
                data: {
                    error: {
                        what: error.code
                    }
                }
            }
        } catch (e) {
            // if a failure occurs during failover, log it to console
            console.log("error during failover", e)
            // test if the response is json, and if not, return an artificial error
            try {
                const response = JSON.parse(JSON.stringify(error.response))
            } catch (err) {
                console.log("returning artificial error")
                return {
                    data: {
                        error: {
                            message: 'API server not returning JSON information.'
                        }
                    }
                }
            }
            // and return the original error
            return error.response
        }
    }
    attemptRetry = (request) => {
        // Rotate URLs in pool
        this.provider.rotatePool()
        // Ensure the pool has available nodes before failing over
        if (this.provider.getPool().length - this.provider.retries >= 0) {
            // Replace request configuration with new URL
            request.baseURL = this.provider.url
            // Retry the request
            return this.retryRequest(request)
        }
        // If the pool is exhaused, reset for the next request
        this.provider.resetPool()
    }

    retryRequest = (originalRequest, milliseconds = 10) =>
        new Promise((resolve, reject) =>
            setTimeout(() => {
                // Resolve the request to the new URL
                resolve(this.provider.axios(originalRequest))
            }, milliseconds))

}
