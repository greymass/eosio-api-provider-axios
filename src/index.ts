import {APIProvider} from '@greymass/eosio'
import axios, {AxiosInstance} from 'axios'

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
}

type UrlType = string | string[]

export class AxiosProvider implements APIProvider {
    readonly urls: string[]

    private axios: AxiosInstance
    private url: string
    private mode: string = 'failover'
    private pool: string[]
    private retries: number = 0

    constructor(urls: UrlType, options: AxiosProviderOptions = {}) {
        if (Array.isArray(urls)) {
            this.urls = urls.map((url) => this.cleanUrl(url))
        } else {
            this.urls = [urls]
        }
        const [url, ...pool] = this.urls
        // Pool of URLs including all but first
        this.pool = pool
        // Set the current URL as the first provided
        this.url = url
        if (!options.axios) {
            this.axios = this.initialize()
        } else {
            this.axios = options.axios
        }
    }

    async call(path: string, params?: unknown) {
        return this.axios
            .post(path, params)
            .then(response => response.data)
            .catch(this.handleError)
    }

    getInstance() {
        return axios.create({
            baseURL: this.url,
            timeout: 1000,
        })
    }

    initialize() {
        const instance = this.getInstance()
        instance.interceptors.response.use(
            response => response,
            error => this.onError(error)
        )
        return instance
    }

    onError = (error) => {
        const request = error.config
        try {
            // If mode is failover and a connection pool exists, attempt retry
            if (this.mode === 'failover' && this.pool.length) {
                const retry = this.attemptRetry(request)
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
        this.rotatePool()
        // Ensure the pool has available nodes before failing over
        if (this.pool.length - this.retries >= 0) {
            // Retry the request
            return this.retryRequest(request)
        }
        // If the pool is exhaused, reset for the next request
        this.resetPool()
    }

    retryRequest = (originalRequest, milliseconds = 10) =>
        new Promise((resolve, reject) =>
            setTimeout(() => {
                // Initialize axios with the new base URL
                this.axios = this.initialize()
                // Replace request configuration with new URL
                originalRequest.baseURL = this.url
                // Resolve the request to the new URL
                resolve(this.axios(originalRequest))
            }, milliseconds))

    rotatePool() {
        // pull the next url and the remainder of the pool
        const [url, ...pool] = this.pool
        // push the current url onto the end of the pool
        pool.push(this.url)
        // set all values
        this.url = url
        this.pool = pool
        this.retries = this.retries + 1
    }

    resetPool = () => {
        const [url, ...pool] = this.urls
        this.pool = pool
        this.url = url
    }

    cleanUrl(url) {
        url = url.trim()
        if (url.endsWith('/')) url = url.slice(0, -1)
        return url
    }

    handleError(e) {
        try {
            return e.response.data
        } catch(err) {
            console.log(`Unhandled error: ${err}`)
        }
    }
}
