import 'mocha'
import * as assert from 'assert'
import {join as joinPath} from 'path'
import {AxiosInstance} from 'axios';
import {APIClient, APIError} from '@greymass/eosio'

import {AxiosProvider} from '../src'

suite('interceptor - failover', function () {
    this.slow(200)

    test('failover behaviour', async function () {
        const api = new APIClient({
            provider: new AxiosProvider([
                'http://bogus1.greymass.com',
                'https://bogus2.greymass.com',
                'https://jungle3.greymass.com',
            ])
        })
        const account = await api.v1.chain.get_account('eosio')
        assert.equal(account.account_name, 'eosio')
    })

    test('pool depleted returning error', async function () {
        try {
            const api = new APIClient({
                provider: new AxiosProvider([
                    'http://bogus1.greymass.com',
                    'https://bogus2.greymass.com',
                    'https://jungle3.greymass.com',
                ])
            })
            await api.call({path: '/v1/chain/get_account', params: {account_name: '.'}})
            assert.fail()
        } catch (error) {
            assert.equal(error instanceof APIError, true)
            assert.equal(error.message, 'Invalid name at /v1/chain/get_account')
            assert.equal(error.name, 'name_type_exception')
            assert.equal(error.code, 3010001)
            assert.deepEqual(error.details, [
                {
                    file: 'name.cpp',
                    line_number: 15,
                    message: 'Name not properly normalized (name: ., normalized: ) ',
                    method: 'set',
                },
            ])
        }
    })

    test('pool recycles on multiple requests', async function () {
        const api = new APIClient({
            provider: new AxiosProvider([
                'http://bogus1.greymass.com',
                'https://bogus2.greymass.com',
                'https://jungle3.greymass.com',
            ])
        })
        const test1 = await api.v1.chain.get_account('eosio')
        assert.equal(test1.account_name, 'eosio')
        const test2 = await api.v1.chain.get_account('eosio')
        assert.equal(test2.account_name, 'eosio')
    })

})
