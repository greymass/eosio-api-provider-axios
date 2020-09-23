import 'mocha'
import * as assert from 'assert'
import {join as joinPath} from 'path'
import {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig
} from 'axios';
import {APIClient, APIError} from '@greymass/eosio'

import {AxiosProvider} from '../src'
import {AxiosProviderInterceptor} from '../src/types'

class MockInterceptor implements AxiosProviderInterceptor {
    provider: AxiosProvider
    constructor(provider: AxiosProvider) {
        this.provider = provider
    }
    onResponse(response: AxiosRequestConfig) {
        return response
    }
    onError(error: AxiosError) {
        // console.log(error)
        return {
            foo: 'bar',
            ...error.response
        }
    }
}

suite('interceptor - generic', function () {

    test('override interceptor', async function () {
        const urls = [
            'https://jungle3.greymass.com',
        ]
        const provider = new AxiosProvider(urls, {
            interceptor: MockInterceptor
        })
        const api = new APIClient({ provider })
        const account = await api.v1.chain.get_account('eosio')
        // assert.equal(account.account_name, 'eosio')
    })

})
