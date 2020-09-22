import {APIProvider} from '@greymass/eosio'
import axios, {AxiosInstance} from 'axios'

import {AxiosProviderOptions, UrlType} from './types'
import AxiosProviderInterceptorFailover from './interceptors/failover'

export class AxiosProvider implements APIProvider {
    readonly urls: string[]

    public axios: AxiosInstance
    public url: string
    public retries: number = 0

    private mode: string = 'failover'
    private pool: string[]

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

    initialize() {
        const instance = this.getInstance()
        let interceptor
        switch (this.mode) {
            case "failover":
            default: {
                interceptor = new AxiosProviderInterceptorFailover(this)
            }
        }
        instance.interceptors.response.use(
            response => interceptor.onResponse(response),
            error => interceptor.onError(error)
        )
        return this.axios = instance
    }

    getInstance = () => axios.create({
        baseURL: this.url,
        timeout: 1000,
    })

    getPool = () => this.pool

    rotatePool = () => {
        // pull the next url and the remainder of the pool
        const [url, ...pool] = this.pool
        // push the current url onto the end of the pool
        pool.push(this.url)
        // set all values
        this.url = url
        this.pool = pool
        this.retries = this.retries + 1
        // initialize again with new url
        this.initialize()
    }

    resetPool = () => {
        const [url, ...pool] = this.urls
        this.pool = pool
        this.url = url
    }

    cleanUrl = (url) => {
        url = url.trim()
        if (url.endsWith('/')) url = url.slice(0, -1)
        return url
    }

    handleError = (e) => {
        try {
            return e.response.data
        } catch(err) {
            console.log(`Unhandled error: ${err}`)
        }
    }
}
