import {APIProvider} from '@greymass/eosio'
import axios, {AxiosInstance} from 'axios';

export interface AxiosProviderOptions {
    /**
     * Axios instance, must be provided in non-browser environments.
     * You can use the node-fetch package in Node.js.
     */
    axios?: AxiosInstance
}

type UrlType = string | string[]

export class AxiosProvider implements APIProvider {
    readonly urls: string[]

    private axios: AxiosInstance
    private url: string
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
            .then(response => {
                return response.data
            })
            .catch(this.handleError.bind(this))
            .finally(() => {
                this.retries = 0
            })
    }

    getInstance() {
        return axios.create({
          baseURL: this.url,
          timeout: 1000,
        })
    }

    initialize() {
        const instance = this.getInstance()

        const retryRequest = (originalRequest, milliseconds = 10) =>
            new Promise((resolve, reject) =>
                setTimeout(() => {
                    // Initialize axios with the new base URL
                    this.axios = this.initialize()
                    // Replace request configuration with new URL
                    originalRequest.baseURL = this.url
                    // Resolve the request to the new URL
                    resolve(this.axios(originalRequest))
                }, milliseconds));

        const { pool } = this;
        instance.interceptors.response.use(
            response => response,
            error => {
                const request = error.config;
                try {
                    // If a connection pool exists, rotate and attempt retry
                    if (this.pool.length) {
                        // Rotate URLs in pool
                        this.rotatePool()
                        // Ensure the pool has available nodes before failing over
                        if (this.pool.length - this.retries >= 0) {
                            // Retry the request
                            return retryRequest(request);
                        }
                        // If the pool is exhaused, reset for the next request
                        const [url, ...pool] = this.urls
                        this.pool = pool
                        this.url = url
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
        )
        return instance
    }

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
